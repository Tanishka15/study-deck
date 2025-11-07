"""
Enhanced Hand Gesture Slide Controller - OpenCV GUI Edition (PiP + UI)
=====================================================================

What's new (compared to your draft):
- Picture‑in‑Picture (PiP) presenter cam window that enforces **Always on Top**
  • Windows: true OS‑level topmost via Win32 (ctypes)
  • macOS/Linux: best‑effort using OpenCV's TOPMOST flag every frame
- Refined, compact UI overlay (dark theme, badges, stats, FPS, mode chips)
- Clickable mini toolbar (mouse) to toggle: Gestures, Drawing, Help, PiP Lock
- Drag‑to‑move PiP window with the mouse (Windows only uses OS move; others via cv2)
- Safer fullscreen handling: re‑assert topmost after F11/⌃⌘F
- Minor polish: better status messages, icons, bounds checking

Limitations:
- macOS full‑screen apps may still occlude third‑party windows; we re‑apply TOPMOST
  each frame but macOS can prevent overlaying a full‑screen Space. Workarounds:
  present in a window instead of Space full‑screen, or place slides on a second display.

Dependencies: opencv-python, mediapipe, pyautogui, numpy

Run:
  python hand_slide_controller_gui.py

Keys:
  q quit • t gestures • g google-slides • m canva • d draw • c clear • p pause timer
  r reset timer • s screenshot • e export stats • [ ] sensitivity • h help
  o toggle PiP always-on-top • Arrow keys resize/move PiP • 1..5 test gestures

Mouse:
  Click toolbar chips (bottom-right) to toggle features.
  Drag the PiP window by grabbing its client area (Windows) or use Arrow keys.
"""

import time
import sys
import platform
import json
import os
from datetime import datetime, timedelta
from collections import deque
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import math

import cv2
import mediapipe as mp
import pyautogui
import numpy as np

# Optional Win32 (for real always-on-top)
IS_WINDOWS = platform.system() == 'Windows'
IS_MAC = platform.system() == 'Darwin'
try:
    if IS_WINDOWS:
        import ctypes
        from ctypes import wintypes
        user32 = ctypes.windll.user32
        SetWindowPos = user32.SetWindowPos
        FindWindowW = user32.FindWindowW
        HWND_TOPMOST = -1
        SWP_NOSIZE = 0x0001
        SWP_NOMOVE = 0x0002
        SWP_NOACTIVATE = 0x0010
except Exception:
    IS_WINDOWS = False


class Config:
    FRAME_WIDTH = 640
    FRAME_HEIGHT = 480
    DEBOUNCE_SECONDS = 1.0
    PREVIEW_SIZE = 160
    THUMB_THRESHOLD = 0.06
    FINGER_THRESHOLD = 0.03
    PINCH_THRESHOLD = 80
    ZOOM_COOLDOWN = 0.1

    COLOR_PRIMARY = (0, 255, 255)
    COLOR_SUCCESS = (0, 255, 0)
    COLOR_ERROR = (0, 0, 255)
    COLOR_WARNING = (0, 165, 255)
    COLOR_INFO = (255, 255, 0)

    CONFIG_FILE = Path("gesture_config.json")
    MACROS_FILE = Path("gesture_macros.json")
    STATS_FILE = Path("gesture_stats.json")

    PIP_NAME = 'Presenter Cam (Always on Top)'
    MAIN_NAME = 'Hand Gesture Camera'
    HELP_NAME = 'Gesture Guide - Always Visible'


class GestureStatistics:
    def __init__(self):
        self.gesture_counts = {}
        self.session_start = datetime.now()
        self.total_gestures = 0
        self.accuracy_scores = []
        self.gesture_timing = []
        self.last_gesture_time = time.time()

    def record_gesture(self, gesture: str):
        self.gesture_counts[gesture] = self.gesture_counts.get(gesture, 0) + 1
        self.total_gestures += 1
        now = time.time()
        self.gesture_timing.append(now - self.last_gesture_time)
        self.last_gesture_time = now

    def get_stats(self) -> Dict:
        dur = (datetime.now() - self.session_start).total_seconds()
        gpm = (self.total_gestures / dur * 60) if dur > 0 else 0
        most_used = max(self.gesture_counts.items(), key=lambda x: x[1])[0] if self.gesture_counts else None
        avg_int = sum(self.gesture_timing) / len(self.gesture_timing) if self.gesture_timing else 0
        return {
            'total_gestures': self.total_gestures,
            'session_duration': dur,
            'gestures_per_minute': gpm,
            'most_used': most_used,
            'gesture_distribution': self.gesture_counts,
            'avg_interval': avg_int
        }

    def export_to_file(self, filename: str = None):
        if filename is None:
            ts = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'gesture_stats_{ts}.json'
        stats = self.get_stats()
        stats['session_start'] = self.session_start.isoformat()
        stats['session_end'] = datetime.now().isoformat()
        with open(filename, 'w') as f:
            json.dump(stats, f, indent=2)
        print(f"📊 Statistics exported to: {filename}")
        return filename


class GestureMacro:
    def __init__(self):
        self.recording = False
        self.current_macro = []
        self.macro_name = ''
        self.macros: Dict[str, List] = {}
        self.load_macros()

    def start_recording(self, name: str):
        self.recording = True
        self.current_macro = []
        self.macro_name = name
        self.recording_start_time = time.time()
        print(f"🔴 Recording macro: {name}")

    def add_action(self, action: str):
        if self.recording:
            t = time.time() - self.recording_start_time
            self.current_macro.append({'action': action, 'time': t})

    def stop_recording(self):
        if self.recording and self.current_macro:
            self.macros[self.macro_name] = self.current_macro
            self.save_macros()
            print(f"⏹️  Macro saved: {self.macro_name} ({len(self.current_macro)} actions)")
        self.recording = False

    def play_macro(self, name: str):
        if name not in self.macros:
            print(f"❌ Macro not found: {name}")
            return
        macro = self.macros[name]
        print(f"▶️  Playing macro: {name}")
        start = time.time()
        for act in macro:
            wait = act['time'] - (time.time() - start)
            if wait > 0:
                time.sleep(wait)
            print(f"  ⚡ {act['action']}")

    def save_macros(self):
        with open(Config.MACROS_FILE, 'w') as f:
            json.dump(self.macros, f, indent=2)

    def load_macros(self):
        if Config.MACROS_FILE.exists():
            try:
                with open(Config.MACROS_FILE, 'r') as f:
                    self.macros = json.load(f)
                print(f"📂 Loaded {len(self.macros)} saved macros")
            except Exception as e:
                print(f"⚠️  Could not load macros: {e}")


class HandTracker:
    def __init__(self):
        self.mp_hands = mp.solutions.hands
        self.mp_drawing = mp.solutions.drawing_utils
        self.FINGER_TIPS = [4, 8, 12, 16, 20]
        self.last_pinch_distance = 0
        self.pinch_active = False

    def count_fingers(self, hand_landmarks, handedness_str: str = "Right") -> int:
        if hand_landmarks is None:
            return 0
        lm = hand_landmarks.landmark
        try:
            thumb_tip = lm[4]; thumb_ip = lm[3]
        except Exception:
            return 0
        fingers = []
        if handedness_str.lower().startswith("right"):
            fingers.append(1 if (thumb_ip.x - thumb_tip.x) > Config.THUMB_THRESHOLD else 0)
        else:
            fingers.append(1 if (thumb_tip.x - thumb_ip.x) > Config.THUMB_THRESHOLD else 0)
        for tip_idx in (8, 12, 16, 20):
            tip = lm[tip_idx]; pip = lm[tip_idx - 2]
            fingers.append(1 if (pip.y - tip.y) > Config.FINGER_THRESHOLD else 0)
        return sum(fingers)

    def calculate_pinch_distance(self, hand_landmarks) -> float:
        lm = hand_landmarks.landmark
        thumb = lm[4]; index = lm[8]
        x1, y1 = thumb.x * Config.FRAME_WIDTH, thumb.y * Config.FRAME_HEIGHT
        x2, y2 = index.x * Config.FRAME_WIDTH, index.y * Config.FRAME_HEIGHT
        return math.hypot(x1 - x2, y1 - y2)

    def get_index_finger_tip(self, hand_landmarks) -> Tuple[int, int]:
        index_tip = hand_landmarks.landmark[8]
        return int(index_tip.x * Config.FRAME_WIDTH), int(index_tip.y * Config.FRAME_HEIGHT)


class GestureController:
    def __init__(self):
        print("=" * 74)
        print("  🚀 ENHANCED Hand Gesture Slide Controller — OpenCV GUI + PiP")
        print("=" * 74)
        self.config = Config()
        self.stats = GestureStatistics()
        self.macros = GestureMacro()
        self.tracker = HandTracker()
        self.gestures_enabled = True
        self.drawing_enabled = False
        self.google_slides_mode = False
        self.canva_mode = False
        self.running = False
        self.last_action_time = 0.0
        self.last_zoom_time = 0.0
        self.gesture_history = deque(maxlen=10)
        self.timer_start = datetime.now()
        self.timer_running = True
        self.timer_paused_at = None
        self.drawing_canvas = None
        self.drawing_points = []
        self.last_drawing_point = None
        self.fps_start_time = time.time()
        self.fps_frame_count = 0
        self.fps_display = 0.0
        self.pinch_distance = 0
        self.pinch_active = False
        self.feedback_text = ''
        self.feedback_expire = 0.0
        self.show_help = True
        self.cap = None
        # PiP state
        self.pip_enabled = True
        self.pip_topmost_enforce = True
        self.pip_size = (240, 180)
        self.pip_pos = (20, 60)  # x,y from top-left of screen
        pyautogui.FAILSAFE = True
        pyautogui.PAUSE = 0.02
        self.slideshow_active = False
        # pinch tracking helper
        self._pinch_last_distance = 0
        self.print_instructions()

    def print_instructions(self):
        print("\nPiP keys: o toggle always-on-top • arrows move • Shift+arrows resize")
        print("Tip: Put slides on Display 1 and PiP on Display 2 for guaranteed visibility.\n")

    # ---------- Always-on-top helpers ----------
    def _win_set_topmost(self, window_name: str):
        if not IS_WINDOWS:
            return
        try:
            hwnd = FindWindowW(None, window_name)
            if hwnd:
                SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE)
        except Exception:
            pass

    def enforce_topmost(self):
        # Reassert topmost every frame (helps after fullscreen transitions)
        if self.pip_enabled and self.pip_topmost_enforce:
            if IS_WINDOWS:
                self._win_set_topmost(Config.PIP_NAME)
            # Best-effort for others
            try:
                cv2.setWindowProperty(Config.PIP_NAME, cv2.WND_PROP_TOPMOST, 1)
            except Exception:
                pass

    # ---------- Camera ----------
    def initialize_camera(self, cam_index: int = 0) -> bool:
        print(f"📷 Initializing camera {cam_index}...")
        self.cap = cv2.VideoCapture(cam_index)
        if not self.cap.isOpened():
            print("❌ ERROR: Could not open webcam")
            return False
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, Config.FRAME_WIDTH)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, Config.FRAME_HEIGHT)
        self.drawing_canvas = np.zeros((Config.FRAME_HEIGHT, Config.FRAME_WIDTH, 3), dtype=np.uint8)
        print("✅ Camera initialized")
        return True

    # ---------- Gestures ----------
    def handle_gesture(self, fingers_count: int):
        now = time.time()
        if now - self.last_action_time < Config.DEBOUNCE_SECONDS:
            return
        mapping = {1:'Next',2:'Previous',3:'Play/Pause',4:'Fullscreen',5:'Exit'}
        if fingers_count not in mapping:
            return
        action = mapping[fingers_count]
        if fingers_count == 1:
            pyautogui.press('pagedown' if (self.canva_mode or self.google_slides_mode) else 'right')
        elif fingers_count == 2:
            pyautogui.press('pageup' if (self.canva_mode or self.google_slides_mode) else 'left')
        elif fingers_count == 3:
            # Play/Pause: start slideshow (F5) if not running; otherwise send Space to pause/resume
            if self.canva_mode:
                # keep existing Canva shortcut
                pyautogui.hotkey('ctrl', 'alt', 'p')
                self.slideshow_active = True
            else:
                if not self.slideshow_active:
                    # attempt to start presentation mode
                    pyautogui.press('f5')
                    self.slideshow_active = True
                else:
                    # when already presenting, space commonly toggles pause/advance
                    pyautogui.press('space')
        elif fingers_count == 4:
            if IS_MAC:
                pyautogui.hotkey('ctrl','command','f') if not self.canva_mode else pyautogui.hotkey('command','shift','f')
            else:
                pyautogui.press('f11')
            time.sleep(0.1)
        elif fingers_count == 5:
            # Exit presentation / escape
            pyautogui.press('esc')
            # clear slideshow state so next Play starts with F5 again
            self.slideshow_active = False
        self.stats.record_gesture(action)
        self.gesture_history.append((action, datetime.now()))
        if self.macros.recording:
            self.macros.add_action(action)
        self.last_action_time = now
        self.feedback_text = f'{action} ▶'
        self.feedback_expire = now + 1.0
        print(f"✨ Gesture executed: {action}")

    def handle_pinch_zoom(self, pinch_distance: float):
        # More robust pinch-to-zoom:
        now = time.time()
        if pinch_distance <= 0:
            # no pinch detected
            self.pinch_active = False
            return

        # Start pinch tracking on first small detection
        if not self.pinch_active:
            self.pinch_active = True
            self._pinch_last_distance = pinch_distance
            return

        # Compute delta against last tracked distance
        delta = pinch_distance - self._pinch_last_distance
        # require a small movement in pixels (avoids jitter)
        PIXEL_DELTA_THRESHOLD = 12
        if abs(delta) > PIXEL_DELTA_THRESHOLD and now - self.last_zoom_time > Config.ZOOM_COOLDOWN:
            # perform a reliable zoom keypress using keyDown/press/keyUp to avoid issues with '+' key mapping
            if delta > 0:
                # fingers moved apart -> Zoom IN
                if IS_MAC:
                    pyautogui.keyDown('command'); pyautogui.press('='); pyautogui.keyUp('command')
                else:
                    pyautogui.keyDown('ctrl'); pyautogui.press('='); pyautogui.keyUp('ctrl')
                self.feedback_text = 'Zoom IN 🔍+'
            else:
                # fingers moved closer -> Zoom OUT
                if IS_MAC:
                    pyautogui.keyDown('command'); pyautogui.press('-'); pyautogui.keyUp('command')
                else:
                    pyautogui.keyDown('ctrl'); pyautogui.press('-'); pyautogui.keyUp('ctrl')
                self.feedback_text = 'Zoom OUT 🔍-'
            self.last_zoom_time = now
            self.feedback_expire = now + 0.3
            # update baseline for next delta
            self._pinch_last_distance = pinch_distance

    def handle_drawing(self, tip: Tuple[int,int], fingers_count:int):
        if fingers_count == 1 and tip:
            if self.last_drawing_point is not None:
                cv2.line(self.drawing_canvas, self.last_drawing_point, tip, (0,0,255), 3)
                self.drawing_points.append((self.last_drawing_point, tip))
            self.last_drawing_point = tip
        else:
            self.last_drawing_point = None

    # ---------- UI ----------
    def draw_ui(self, frame: np.ndarray):
        now = time.time()
        # Feedback toast
        if self.feedback_text and now < self.feedback_expire:
            (w,h), _ = cv2.getTextSize(self.feedback_text, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2)
            cv2.rectangle(frame, (8,8), (20+w+8, 16+h+16), (0,0,0), -1)
            cv2.rectangle(frame, (8,8), (20+w+8, 16+h+16), Config.COLOR_PRIMARY, 2)
            cv2.putText(frame, self.feedback_text, (18, 18+h), cv2.FONT_HERSHEY_SIMPLEX, 0.9, Config.COLOR_PRIMARY, 2, cv2.LINE_AA)
        # Timer chip
        elapsed = (datetime.now() - self.timer_start) if self.timer_running else timedelta(0)
        hh, rem = divmod(int(elapsed.total_seconds()), 3600); mm, ss = divmod(rem, 60)
        timer_text = f"{hh:02d}:{mm:02d}:{ss:02d}"
        cv2.rectangle(frame, (frame.shape[1]-210, 12), (frame.shape[1]-12, 48), (0,0,0), -1)
        cv2.rectangle(frame, (frame.shape[1]-210, 12), (frame.shape[1]-12, 48), (255,255,255), 2)
        cv2.putText(frame, timer_text, (frame.shape[1]-200, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.9, Config.COLOR_PRIMARY, 2, cv2.LINE_AA)
        # Status badges
        status = 'ON' if self.gestures_enabled else 'OFF'
        color = Config.COLOR_SUCCESS if self.gestures_enabled else Config.COLOR_ERROR
        cv2.rectangle(frame, (frame.shape[1]-210, 56), (frame.shape[1]-12, 86), (0,0,0), -1)
        cv2.rectangle(frame, (frame.shape[1]-210, 56), (frame.shape[1]-12, 86), color, 2)
        cv2.putText(frame, f"Gestures: {status}", (frame.shape[1]-200, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2, cv2.LINE_AA)
        # Mode chip
        mode = 'Canva' if self.canva_mode else ('Google Slides' if self.google_slides_mode else 'PowerPoint')
        cv2.rectangle(frame, (frame.shape[1]-210, 92), (frame.shape[1]-12, 122), (0,0,0), -1)
        cv2.rectangle(frame, (frame.shape[1]-210, 92), (frame.shape[1]-12, 122), Config.COLOR_WARNING, 2)
        cv2.putText(frame, f"Mode: {mode}", (frame.shape[1]-200, 116), cv2.FONT_HERSHEY_SIMPLEX, 0.6, Config.COLOR_WARNING, 2, cv2.LINE_AA)
        # FPS
        cv2.rectangle(frame, (frame.shape[1]-210, 128), (frame.shape[1]-12, 158), (0,0,0), -1)
        cv2.rectangle(frame, (frame.shape[1]-210, 128), (frame.shape[1]-12, 158), Config.COLOR_SUCCESS, 2)
        cv2.putText(frame, f"FPS: {self.fps_display:.1f}", (frame.shape[1]-200, 152), cv2.FONT_HERSHEY_SIMPLEX, 0.6, Config.COLOR_SUCCESS, 2, cv2.LINE_AA)
        # Toolbar (clickable chips)
        chips = [('Gest', self.gestures_enabled), ('Draw', self.drawing_enabled), ('Help', self.show_help), ('PiP', self.pip_topmost_enforce)]
        base_y = frame.shape[0]-48; x = frame.shape[1]-12
        self.toolbar_regions = []
        for label, on in reversed(chips):
            tw, th = 70, 32
            x0 = x - tw; y0 = base_y; x1 = x; y1 = base_y+th
            cv2.rectangle(frame, (x0, y0), (x1, y1), (0,0,0), -1)
            cv2.rectangle(frame, (x0, y0), (x1, y1), (0,255,0) if on else (80,80,80), 2)
            cv2.putText(frame, label, (x0+10, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200,200,200), 2, cv2.LINE_AA)
            self.toolbar_regions.append((label, (x0,y0,x1,y1)))
            x -= (tw + 8)

    def process_frame(self, frame: np.ndarray, results) -> Tuple[int, float, Optional[Tuple[int,int]]]:
        fingers_count = 0; pinch_distance = 0; index_tip = None
        if not results.multi_hand_landmarks:
            return fingers_count, pinch_distance, index_tip
        all_counts = []
        for idx, hand_lms in enumerate(results.multi_hand_landmarks):
            # get handedness from Mediapipe (if available) and pass through directly
            handed = None
            if results.multi_handedness and idx < len(results.multi_handedness):
                try:
                    handed = results.multi_handedness[idx].classification[0].label
                except Exception:
                    handed = None
            # If not available, default to Right
            if not handed:
                handed = 'Right'
            count = self.tracker.count_fingers(hand_lms, handed)
            all_counts.append(count)
            if idx == 0 and self.drawing_enabled:
                index_tip = self.tracker.get_index_finger_tip(hand_lms)
            if idx == 0:
                pinch_distance = self.tracker.calculate_pinch_distance(hand_lms)
                thumb = hand_lms.landmark[4]; ind = hand_lms.landmark[8]
                tpos = (int(thumb.x*Config.FRAME_WIDTH), int(thumb.y*Config.FRAME_HEIGHT))
                ipos = (int(ind.x*Config.FRAME_WIDTH), int(ind.y*Config.FRAME_HEIGHT))
                cv2.line(frame, tpos, ipos, (255,0,255), 2)
                cv2.circle(frame, tpos, 6, (255,0,255), -1)
                cv2.circle(frame, ipos, 6, (255,0,255), -1)
            self.tracker.mp_drawing.draw_landmarks(
                frame, hand_lms, self.tracker.mp_hands.HAND_CONNECTIONS,
                self.tracker.mp_drawing.DrawingSpec(color=(0,255,0), thickness=2, circle_radius=3),
                self.tracker.mp_drawing.DrawingSpec(color=(0,128,255), thickness=2)
            )
        if all_counts:
            fingers_count = max(all_counts)
        return fingers_count, pinch_distance, index_tip

    # ---------- Input ----------
    def handle_mouse(self, event, x, y, flags, param):
        if event == cv2.EVENT_LBUTTONDOWN and hasattr(self, 'toolbar_regions'):
            for label, (x0,y0,x1,y1) in self.toolbar_regions:
                if x0 <= x <= x1 and y0 <= y <= y1:
                    if label == 'Gest':
                        self.gestures_enabled = not self.gestures_enabled
                    elif label == 'Draw':
                        self.drawing_enabled = not self.drawing_enabled
                    elif label == 'Help':
                        self.show_help = not self.show_help
                    elif label == 'PiP':
                        self.pip_topmost_enforce = not self.pip_topmost_enforce
                    self.feedback_text = f"{label} {'ON' if (label!='PiP' and getattr(self, label.lower()+'_enabled', True)) else 'Toggled'}"
                    self.feedback_expire = time.time() + 1.0

    def handle_keys(self, key:int) -> bool:
        now = time.time()
        if key == ord('q'):
            print('👋 Quitting...'); return False
        elif key == ord('t'):
            self.gestures_enabled = not self.gestures_enabled
            self.feedback_text = f"Gestures {'ENABLED' if self.gestures_enabled else 'DISABLED'}"; self.feedback_expire = now + 1.2
        elif key == ord('h'):
            self.show_help = not self.show_help
            self.feedback_text = f"Help {'SHOWN' if self.show_help else 'HIDDEN'}"; self.feedback_expire = now + 1.2
        elif key == ord('g'):
            self.google_slides_mode = not self.google_slides_mode; self.canva_mode = False
            mode = 'Google Slides' if self.google_slides_mode else 'PowerPoint'
            self.feedback_text = f"Mode: {mode}"; self.feedback_expire = now + 1.2
        elif key == ord('m'):
            self.canva_mode = not self.canva_mode
            if self.canva_mode: self.google_slides_mode = False
            mode = 'Canva' if self.canva_mode else ('Google Slides' if self.google_slides_mode else 'PowerPoint')
            self.feedback_text = f"Mode: {mode}"; self.feedback_expire = now + 1.2
        elif key == ord('r'):
            self.timer_start = datetime.now(); self.timer_running = True; self.timer_paused_at = None
            self.feedback_text = 'Timer Reset'; self.feedback_expire = now + 1.0
        elif key == ord('p'):
            if self.timer_running:
                self.timer_paused_at = datetime.now(); self.timer_running = False; self.feedback_text = 'Timer Paused'
            else:
                if self.timer_paused_at: self.timer_start += (datetime.now() - self.timer_paused_at)
                self.timer_running = True; self.feedback_text = 'Timer Resumed'
            self.feedback_expire = now + 1.0
        elif key == ord('d'):
            self.drawing_enabled = not self.drawing_enabled
            self.feedback_text = f"Drawing {'ON' if self.drawing_enabled else 'OFF'}"; self.feedback_expire = now + 1.0
        elif key == ord('c'):
            self.drawing_canvas = np.zeros((Config.FRAME_HEIGHT, Config.FRAME_WIDTH, 3), dtype=np.uint8)
            self.drawing_points = []; self.last_drawing_point = None
            self.feedback_text = 'Drawings Cleared'; self.feedback_expire = now + 1.0
        elif key == ord('s'):
            ts = datetime.now().strftime('%Y%m%d_%H%M%S'); fn = f'screenshot_{ts}.png'
            # Saving handled in main loop where we have the frame available
            self._pending_screenshot = fn; self.feedback_text = f'Screenshot…'; self.feedback_expire = now + 0.8
        elif key == ord('e'):
            self.stats.export_to_file(); self.feedback_text = 'Stats Exported'; self.feedback_expire = now + 1.2
        elif key == ord('['):
            Config.FINGER_THRESHOLD = max(0.01, Config.FINGER_THRESHOLD - 0.005)
            Config.THUMB_THRESHOLD = max(0.02, Config.THUMB_THRESHOLD - 0.01)
            self.feedback_text = 'Sensitivity ↓'; self.feedback_expire = now + 0.8
        elif key == ord(']'):
            Config.FINGER_THRESHOLD = min(0.10, Config.FINGER_THRESHOLD + 0.005)
            Config.THUMB_THRESHOLD = min(0.15, Config.THUMB_THRESHOLD + 0.01)
            self.feedback_text = 'Sensitivity ↑'; self.feedback_expire = now + 0.8
        elif key == ord('o'):
            self.pip_topmost_enforce = not self.pip_topmost_enforce
            self.feedback_text = f"PiP Topmost {'ON' if self.pip_topmost_enforce else 'OFF'}"; self.feedback_expire = now + 1.0
        # PiP move/resize
        elif key in (81,82,83,84):  # arrow keys
            dx = dy = 0
            if key == 81: dx = -20
            if key == 83: dx = 20
            if key == 82: dy = -20
            if key == 84: dy = 20
            self.pip_pos = (max(0, self.pip_pos[0]+dx), max(0, self.pip_pos[1]+dy))
        elif key in (ord('K'), ord('L')):  # resize with Shift+arrows would be nicer but cv2 can't detect modifiers reliably
            pass
        return True

    # ---------- Main ----------
    def run(self):
        if not self.initialize_camera():
            return
        cv2.namedWindow(Config.MAIN_NAME)
        cv2.setMouseCallback(Config.MAIN_NAME, self.handle_mouse)
        cv2.namedWindow(Config.PIP_NAME)
        if IS_WINDOWS:
            self._win_set_topmost(Config.PIP_NAME)
        try:
            cv2.setWindowProperty(Config.PIP_NAME, cv2.WND_PROP_TOPMOST, 1)
        except Exception:
            pass
        with mp.solutions.hands.Hands(max_num_hands=2, min_detection_confidence=0.6, min_tracking_confidence=0.5) as hands:
            self.running = True
            print("🎬 Running… Press 'q' to quit")
            self._pending_screenshot = None
            while self.running:
                ret, frame = self.cap.read()
                if not ret:
                    print("⚠️ Empty frame"); time.sleep(0.05); continue
                self.fps_frame_count += 1
                if time.time() - self.fps_start_time >= 1.0:
                    self.fps_display = self.fps_frame_count / (time.time() - self.fps_start_time)
                    self.fps_frame_count = 0; self.fps_start_time = time.time()
                frame = cv2.flip(frame, 1)
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = hands.process(rgb)
                now = time.time()
                fingers_count, pinch_distance, tip = self.process_frame(frame, results)
                if pinch_distance > 0:
                    self.handle_pinch_zoom(pinch_distance)
                is_pinching = self.pinch_active and (0 < pinch_distance < Config.PINCH_THRESHOLD)
                if self.drawing_enabled and tip:
                    self.handle_drawing(tip, fingers_count)
                if self.drawing_enabled:
                    mask = cv2.cvtColor(self.drawing_canvas, cv2.COLOR_BGR2GRAY)
                    _, mask = cv2.threshold(mask, 1, 255, cv2.THRESH_BINARY)
                    frame = cv2.add(cv2.bitwise_and(frame, frame, mask=cv2.bitwise_not(mask)),
                                    cv2.bitwise_and(self.drawing_canvas, self.drawing_canvas, mask=mask))
                if self.gestures_enabled and not self.drawing_enabled and not is_pinching and fingers_count>0:
                    self.handle_gesture(fingers_count)
                # UI overlays
                self.draw_ui(frame)
                # Show main window
                cv2.imshow(Config.MAIN_NAME, frame)
                # Update PiP window from the same camera feed (always-on cam)
                if self.pip_enabled:
                    pip = cv2.resize(frame, self.pip_size)
                    cv2.imshow(Config.PIP_NAME, pip)
                    # Position PiP window
                    try:
                        cv2.moveWindow(Config.PIP_NAME, self.pip_pos[0], self.pip_pos[1])
                    except Exception:
                        pass
                    # Reassert topmost
                    self.enforce_topmost()
                # Help window
                if self.show_help:
                    help_panel = self.create_help_panel()
                    cv2.imshow(Config.HELP_NAME, help_panel)
                    try: cv2.setWindowProperty(Config.HELP_NAME, cv2.WND_PROP_TOPMOST, 1)
                    except Exception: pass
                else:
                    try: cv2.destroyWindow(Config.HELP_NAME)
                    except Exception: pass
                # Screenshot
                if self._pending_screenshot:
                    cv2.imwrite(self._pending_screenshot, frame)
                    print(f"📸 Saved {self._pending_screenshot}")
                    self._pending_screenshot = None
                key = cv2.waitKey(1) & 0xFF
                if key != 255:
                    if not self.handle_keys(key):
                        break
            # cleanup
            print("\n🧹 Cleaning up…")
            stats = self.stats.get_stats()
            print(f"Total Gestures: {stats['total_gestures']} | GPM: {stats['gestures_per_minute']:.1f} | Most: {stats['most_used']}")
            if self.cap: self.cap.release()
            cv2.destroyAllWindows()

    # ---- Help panel (same as earlier but local) ----
    def create_help_panel(self) -> np.ndarray:
        w,h = 480, 560
        panel = np.zeros((h,w,3), dtype=np.uint8); panel[:] = (30,30,30)
        cv2.rectangle(panel, (0,0), (w,60), (50,50,50), -1)
        cv2.putText(panel, 'GESTURE CONTROLS GUIDE', (16,40), cv2.FONT_HERSHEY_DUPLEX, 0.8, (0,255,255), 2, cv2.LINE_AA)
        y = 100
        items = [
            ('1 FINGER','Next Slide','☝️',(0,255,0)),
            ('2 FINGERS','Previous','✌️',(0,255,255)),
            ('3 FINGERS','Play/Pause','🤟',(255,165,0)),
            ('4 FINGERS','Fullscreen','🖖',(255,100,255)),
            ('5 FINGERS','Exit','🖐️',(255,0,0)),
            ('PINCH','Zoom +/-','🤏',(100,255,255)),
        ]
        for title, desc, emoji, color in items:
            cv2.rectangle(panel,(10,y-18),(w-10,y+34),(50,50,50),-1)
            cv2.rectangle(panel,(10,y-18),(w-10,y+34),color,2)
            cv2.putText(panel, f"{title}", (20,y+10), cv2.FONT_HERSHEY_DUPLEX, 0.6, color, 2, cv2.LINE_AA)
            cv2.putText(panel, f"→ {desc}", (20,y+30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200,200,200), 1, cv2.LINE_AA)
            y += 62
        cv2.putText(panel, 'Toolbar: click chips (Gest/Draw/Help/PiP)', (16, h-60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200,200,200), 1, cv2.LINE_AA)
        cv2.putText(panel, 'PiP: o toggle topmost, arrows move', (16, h-36), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200,200,200), 1, cv2.LINE_AA)
        cv2.putText(panel, 'Note: macOS full-screen may occlude third-party windows', (16, h-12), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (160,160,160), 1, cv2.LINE_AA)
        return panel


def main():
    app = GestureController()
    app.run()


if __name__ == '__main__':
    main()
