"""
Modern Eye Blink Detection System with Enhanced Visual GUI
Beautiful, responsive interface with real-time feedback
No external GUI dependencies - uses OpenCV only
"""

import cv2
import dlib
import numpy as np
from scipy.spatial import distance
from collections import deque
import time
import csv
from datetime import datetime
import os


class ModernBlinkDetector:
    """
    Modern Eye Blink Detection with Optimized Response Time
    """
    
    LEFT_EYE_INDICES = list(range(36, 42))
    RIGHT_EYE_INDICES = list(range(42, 48))
    
    def __init__(self, 
                 ear_threshold=0.25, 
                 consec_frames=2,  # Reduced from 3 for faster response
                 drowsiness_threshold=1.5,
                 predictor_path="shape_predictor_68_face_landmarks.dat"):
        
        self.ear_threshold = ear_threshold
        self.consec_frames = consec_frames
        self.drowsiness_threshold = drowsiness_threshold
        
        # Initialize dlib
        try:
            self.detector = dlib.get_frontal_face_detector()
            self.predictor = dlib.shape_predictor(predictor_path)
        except RuntimeError as e:
            raise RuntimeError(
                f"Error loading facial landmark predictor: {e}\n"
                f"Please run: ./setup.sh"
            )
        
        # Tracking variables
        self.total_blinks = 0
        self.frame_counter = 0
        self.eyes_closed_start = None
        self.is_drowsy = False
        
        # Blink rate tracking
        self.blink_times = deque(maxlen=100)
        self.session_start_time = time.time()
        
        # Data logging
        self.blink_data = []
        
        # Status
        self.current_ear = 0.0
        self.status = "Ready"
        self.last_blink_time = 0
        
        # Smoothing for EAR
        self.ear_history = deque(maxlen=3)
        
    def calculate_ear(self, eye_landmarks):
        """Calculate Eye Aspect Ratio with improved accuracy"""
        A = distance.euclidean(eye_landmarks[1], eye_landmarks[5])
        B = distance.euclidean(eye_landmarks[2], eye_landmarks[4])
        C = distance.euclidean(eye_landmarks[0], eye_landmarks[3])
        ear = (A + B) / (2.0 * C)
        return ear
    
    def get_eye_landmarks(self, landmarks, eye_indices):
        """Extract eye landmark coordinates"""
        return np.array([(landmarks.part(i).x, landmarks.part(i).y) 
                        for i in eye_indices])
    
    def detect_blink(self, frame):
        """
        Optimized blink detection with reduced lag
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.detector(gray, 0)
        
        blink_detected = False
        
        if len(faces) == 0:
            self.status = "No Face"
            return frame, False, False
        
        for face in faces:
            landmarks = self.predictor(gray, face)
            
            # Get eye landmarks
            left_eye = self.get_eye_landmarks(landmarks, self.LEFT_EYE_INDICES)
            right_eye = self.get_eye_landmarks(landmarks, self.RIGHT_EYE_INDICES)
            
            # Calculate EAR
            left_ear = self.calculate_ear(left_eye)
            right_ear = self.calculate_ear(right_eye)
            current_ear = (left_ear + right_ear) / 2.0
            
            # Smooth EAR to reduce noise
            self.ear_history.append(current_ear)
            self.current_ear = sum(self.ear_history) / len(self.ear_history)
            
            # Draw eye contours with glow effect
            self.draw_eye_with_glow(frame, left_eye, self.current_ear < self.ear_threshold)
            self.draw_eye_with_glow(frame, right_eye, self.current_ear < self.ear_threshold)
            
            # Blink detection with optimized logic
            if self.current_ear < self.ear_threshold:
                self.frame_counter += 1
                self.status = "Closed"
                
                # Drowsiness tracking
                if self.eyes_closed_start is None:
                    self.eyes_closed_start = time.time()
                elif time.time() - self.eyes_closed_start > self.drowsiness_threshold:
                    self.is_drowsy = True
                    self.status = "Drowsy!"
            else:
                # Eyes opened - check for blink
                if self.frame_counter >= self.consec_frames:
                    # Prevent double counting (minimum 150ms between blinks)
                    current_time = time.time()
                    if current_time - self.last_blink_time > 0.15:
                        self.total_blinks += 1
                        blink_detected = True
                        self.last_blink_time = current_time
                        self.blink_times.append(current_time)
                        
                        # Log blink
                        self.blink_data.append({
                            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3],
                            'blink_number': self.total_blinks,
                            'ear_value': round(self.current_ear, 3),
                            'duration_frames': self.frame_counter
                        })
                
                self.frame_counter = 0
                self.eyes_closed_start = None
                self.is_drowsy = False
                self.status = "Open"
        
        return frame, blink_detected, self.is_drowsy
    
    def draw_eye_with_glow(self, frame, eye, is_closed):
        """Draw eye with glowing effect"""
        eye_hull = cv2.convexHull(eye)
        
        # Glow effect
        if is_closed:
            color = (0, 100, 255)  # Orange glow when closed
            cv2.drawContours(frame, [eye_hull], -1, color, 3)
        else:
            color = (0, 255, 100)  # Green glow when open
            cv2.drawContours(frame, [eye_hull], -1, color, 2)
        
        # Inner highlight
        cv2.drawContours(frame, [eye_hull], -1, (255, 255, 255), 1)
    
    def get_blink_rate(self):
        """Calculate blinks per minute"""
        if len(self.blink_times) < 2:
            return 0.0
        
        current_time = time.time()
        recent_blinks = [t for t in self.blink_times if current_time - t <= 60]
        
        if len(recent_blinks) < 2:
            return 0.0
        
        time_span = current_time - recent_blinks[0]
        if time_span > 0:
            return (len(recent_blinks) / time_span) * 60
        return 0.0
    
    def get_average_blink_rate(self):
        """Calculate average blinks per minute"""
        elapsed_time = time.time() - self.session_start_time
        if elapsed_time > 0:
            return (self.total_blinks / elapsed_time) * 60
        return 0.0
    
    def export_data(self, filename=None):
        """Export blink data to CSV"""
        if filename is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'blink_data_{timestamp}.csv'
        
        filepath = os.path.join(os.getcwd(), filename)
        
        with open(filepath, 'w', newline='') as csvfile:
            if self.blink_data:
                fieldnames = self.blink_data[0].keys()
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(self.blink_data)
        
        # Summary
        summary_file = filepath.replace('.csv', '_summary.txt')
        with open(summary_file, 'w') as f:
            f.write("=== Eye Blink Detection Session Summary ===\n\n")
            f.write(f"Total Blinks: {self.total_blinks}\n")
            f.write(f"Session Duration: {time.time() - self.session_start_time:.2f} seconds\n")
            f.write(f"Average Blink Rate: {self.get_average_blink_rate():.2f} blinks/minute\n")
            f.write(f"Current Blink Rate: {self.get_blink_rate():.2f} blinks/minute\n")
        
        return filepath
    
    def reset(self):
        """Reset all counters"""
        self.total_blinks = 0
        self.frame_counter = 0
        self.blink_times.clear()
        self.blink_data.clear()
        self.session_start_time = time.time()
        self.is_drowsy = False
        self.status = "Ready"
        self.last_blink_time = 0
    
    def get_stats(self):
        """Get current statistics"""
        return {
            'total_blinks': self.total_blinks,
            'current_ear': round(self.current_ear, 3),
            'status': self.status,
            'blink_rate': round(self.get_blink_rate(), 2),
            'avg_blink_rate': round(self.get_average_blink_rate(), 2),
            'is_drowsy': self.is_drowsy,
            'session_duration': round(time.time() - self.session_start_time, 2)
        }


class ModernGUI:
    """
    Beautiful modern GUI using OpenCV only
    """
    
    def __init__(self):
        self.detector = ModernBlinkDetector()
        self.cap = cv2.VideoCapture(0)
        
        if not self.cap.isOpened():
            raise RuntimeError("Cannot access webcam")
        
        # GUI settings
        self.width = 1280
        self.height = 720
        self.sidebar_width = 400
        
        # Colors (BGR)
        self.bg_color = (30, 30, 30)
        self.panel_color = (45, 45, 45)
        self.accent_color = (100, 255, 0)
        self.text_color = (255, 255, 255)
        self.warning_color = (0, 100, 255)
        
        # Window name
        self.window_name = "Eye Blink Detection - Modern Interface"
        cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(self.window_name, self.width, self.height)
        
        # Animation
        self.pulse = 0
        self.last_blink_anim = 0
        
    def draw_rounded_rect(self, img, pt1, pt2, color, thickness, radius=15):
        """Draw rounded rectangle"""
        x1, y1 = pt1
        x2, y2 = pt2
        
        # Draw rectangles
        cv2.rectangle(img, (x1 + radius, y1), (x2 - radius, y2), color, thickness)
        cv2.rectangle(img, (x1, y1 + radius), (x2, y2 - radius), color, thickness)
        
        # Draw circles for corners
        cv2.circle(img, (x1 + radius, y1 + radius), radius, color, thickness)
        cv2.circle(img, (x2 - radius, y1 + radius), radius, color, thickness)
        cv2.circle(img, (x1 + radius, y2 - radius), radius, color, thickness)
        cv2.circle(img, (x2 - radius, y2 - radius), radius, color, thickness)
        
        # Fill if thickness is -1
        if thickness < 0:
            cv2.rectangle(img, (x1 + radius, y1), (x2 - radius, y2), color, -1)
            cv2.rectangle(img, (x1, y1 + radius), (x2, y2 - radius), color, -1)
            cv2.circle(img, (x1 + radius, y1 + radius), radius, color, -1)
            cv2.circle(img, (x2 - radius, y1 + radius), radius, color, -1)
            cv2.circle(img, (x1 + radius, y2 - radius), radius, color, -1)
            cv2.circle(img, (x2 - radius, y2 - radius), radius, color, -1)
    
    def draw_panel(self, img, x, y, width, height, title=""):
        """Draw a panel with title"""
        # Panel background
        self.draw_rounded_rect(img, (x, y), (x + width, y + height), self.panel_color, -1, 10)
        
        # Title bar
        if title:
            self.draw_rounded_rect(img, (x, y), (x + width, y + 40), self.accent_color, -1, 10)
            cv2.rectangle(img, (x, y + 30), (x + width, y + 40), self.accent_color, -1)
            
            cv2.putText(img, title, (x + 15, y + 28), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    
    def draw_stat(self, img, x, y, label, value, color=None):
        """Draw a statistic row"""
        if color is None:
            color = self.text_color
        
        # Label
        cv2.putText(img, label, (x, y), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1, cv2.LINE_AA)
        
        # Value
        cv2.putText(img, str(value), (x + 200, y), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2, cv2.LINE_AA)
    
    def draw_blink_animation(self, img, x, y, size, intensity):
        """Draw blink animation effect"""
        if intensity > 0:
            radius = int(size * (1 + intensity * 0.5))
            alpha = int(255 * intensity)
            color = (0, int(255 * intensity), int(100 * intensity))
            
            overlay = img.copy()
            cv2.circle(overlay, (x, y), radius, color, -1)
            cv2.addWeighted(overlay, 0.3, img, 0.7, 0, img)
    
    def draw_progress_bar(self, img, x, y, width, height, value, max_value, color):
        """Draw a progress bar"""
        # Background
        cv2.rectangle(img, (x, y), (x + width, y + height), (60, 60, 60), -1)
        
        # Fill
        if max_value > 0:
            fill_width = int((value / max_value) * width)
            cv2.rectangle(img, (x, y), (x + fill_width, y + height), color, -1)
        
        # Border
        cv2.rectangle(img, (x, y), (x + width, y + height), self.text_color, 1)
    
    def create_frame(self, video_frame, stats):
        """Create the main GUI frame"""
        # Create main canvas
        canvas = np.full((self.height, self.width, 3), self.bg_color, dtype=np.uint8)
        
        # === Left Side: Video Feed ===
        video_width = self.width - self.sidebar_width - 40
        video_height = int(video_width * 9 / 16)  # 16:9 aspect ratio
        
        if video_frame is not None:
            # Resize video
            video_resized = cv2.resize(video_frame, (video_width, video_height))
            
            # Place video
            y_offset = 80
            canvas[y_offset:y_offset + video_height, 20:20 + video_width] = video_resized
            
            # Video frame border with glow
            if stats['is_drowsy']:
                cv2.rectangle(canvas, (18, y_offset - 2), 
                            (22 + video_width, y_offset + video_height + 2),
                            self.warning_color, 3)
            else:
                cv2.rectangle(canvas, (18, y_offset - 2), 
                            (22 + video_width, y_offset + video_height + 2),
                            self.accent_color, 2)
        
        # === Top Bar ===
        self.draw_rounded_rect(canvas, (20, 20), (self.width - 20, 70), self.panel_color, -1, 10)
        
        # Title with emoji-like effect
        cv2.putText(canvas, "EYE BLINK DETECTION SYSTEM", (40, 52), 
                   cv2.FONT_HERSHEY_DUPLEX, 1.0, self.accent_color, 2, cv2.LINE_AA)
        
        # Status indicator
        status_x = self.width - 250
        status_text = f"Status: {stats['status']}"
        status_color = self.warning_color if stats['is_drowsy'] else self.accent_color
        cv2.putText(canvas, status_text, (status_x, 52), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2, cv2.LINE_AA)
        
        # === Right Sidebar: Statistics ===
        sidebar_x = self.width - self.sidebar_width
        
        # Statistics Panel
        self.draw_panel(canvas, sidebar_x, 80, self.sidebar_width - 20, 300, "STATISTICS")
        
        stat_y = 140
        stat_spacing = 35
        
        # Blink count with animation
        blink_label_x = sidebar_x + 20
        blink_value_x = sidebar_x + 220
        
        self.draw_stat(canvas, blink_label_x, stat_y, "Total Blinks:", 
                      stats['total_blinks'], self.accent_color)
        
        # Blink animation
        if time.time() - self.last_blink_anim < 0.5:
            intensity = 1 - (time.time() - self.last_blink_anim) * 2
            self.draw_blink_animation(canvas, blink_value_x + 50, stat_y - 10, 20, intensity)
        
        stat_y += stat_spacing
        self.draw_stat(canvas, blink_label_x, stat_y, "Eye Aspect Ratio:", 
                      f"{stats['current_ear']:.3f}")
        
        stat_y += stat_spacing
        self.draw_stat(canvas, blink_label_x, stat_y, "Blink Rate:", 
                      f"{stats['blink_rate']:.1f} BPM", self.accent_color)
        
        stat_y += stat_spacing
        self.draw_stat(canvas, blink_label_x, stat_y, "Average Rate:", 
                      f"{stats['avg_blink_rate']:.1f} BPM")
        
        stat_y += stat_spacing
        self.draw_stat(canvas, blink_label_x, stat_y, "Session Time:", 
                      f"{stats['session_duration']:.1f}s")
        
        # EAR Progress Bar
        stat_y += 50
        cv2.putText(canvas, "EAR Threshold", (blink_label_x, stat_y - 5), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1, cv2.LINE_AA)
        
        bar_color = self.warning_color if stats['current_ear'] < self.detector.ear_threshold else self.accent_color
        self.draw_progress_bar(canvas, blink_label_x, stat_y + 5, 340, 20, 
                              stats['current_ear'], 0.4, bar_color)
        
        # Threshold line
        threshold_x = blink_label_x + int((self.detector.ear_threshold / 0.4) * 340)
        cv2.line(canvas, (threshold_x, stat_y + 5), (threshold_x, stat_y + 25), 
                (255, 255, 255), 2)
        
        # === Alert Panel ===
        if stats['is_drowsy']:
            alert_y = 400
            self.draw_panel(canvas, sidebar_x, alert_y, self.sidebar_width - 20, 80, "")
            
            # Pulsing alert
            self.pulse = (self.pulse + 0.1) % (2 * np.pi)
            pulse_intensity = (np.sin(self.pulse) + 1) / 2
            alert_color = (0, int(100 + 155 * pulse_intensity), int(255 * pulse_intensity))
            
            cv2.putText(canvas, "DROWSINESS", (sidebar_x + 70, alert_y + 35), 
                       cv2.FONT_HERSHEY_DUPLEX, 1.0, alert_color, 3, cv2.LINE_AA)
            cv2.putText(canvas, "ALERT!", (sidebar_x + 130, alert_y + 65), 
                       cv2.FONT_HERSHEY_DUPLEX, 1.0, alert_color, 3, cv2.LINE_AA)
        
        # === Controls Panel ===
        controls_y = self.height - 200
        self.draw_panel(canvas, sidebar_x, controls_y, self.sidebar_width - 20, 180, "CONTROLS")
        
        controls_text = [
            "Q - Quit Application",
            "R - Reset Counters",
            "S - Save Data to CSV",
            "SPACE - Pause/Resume"
        ]
        
        text_y = controls_y + 60
        for text in controls_text:
            cv2.putText(canvas, text, (sidebar_x + 20, text_y), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1, cv2.LINE_AA)
            text_y += 28
        
        return canvas
    
    def run(self):
        """Main GUI loop"""
        print("=== Modern Eye Blink Detection System ===")
        print("Starting...")
        print("\nControls:")
        print("  Q - Quit")
        print("  R - Reset")
        print("  S - Save")
        print("  SPACE - Pause/Resume")
        print("\n")
        
        paused = False
        
        while True:
            if not paused:
                ret, frame = self.cap.read()
                if not ret:
                    break
                
                # Detect blinks
                frame, blink_detected, is_drowsy = self.detector.detect_blink(frame)
                
                if blink_detected:
                    self.last_blink_anim = time.time()
                
                stats = self.detector.get_stats()
            else:
                frame = None
                stats = self.detector.get_stats()
            
            # Create GUI frame
            gui_frame = self.create_frame(frame, stats)
            
            # Show frame
            cv2.imshow(self.window_name, gui_frame)
            
            # Handle keys
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q') or key == 27:  # Q or ESC
                break
            elif key == ord('r'):
                self.detector.reset()
                print("✓ Counters reset!")
            elif key == ord('s'):
                filepath = self.detector.export_data()
                print(f"✓ Data saved to: {filepath}")
            elif key == ord(' '):
                paused = not paused
                print("⏸ Paused" if paused else "▶ Resumed")
        
        # Cleanup
        self.cap.release()
        cv2.destroyAllWindows()
        
        # Final save
        if self.detector.total_blinks > 0:
            print("\nExporting final data...")
            filepath = self.detector.export_data()
            print(f"✓ Data saved to: {filepath}")
        
        # Show stats
        stats = self.detector.get_stats()
        print("\n=== Session Statistics ===")
        print(f"Total Blinks: {stats['total_blinks']}")
        print(f"Session Duration: {stats['session_duration']:.2f} seconds")
        print(f"Average Blink Rate: {stats['avg_blink_rate']:.2f} blinks/minute")
        print("\nThank you for using Eye Blink Detection System!")


def main():
    """Main entry point"""
    try:
        gui = ModernGUI()
        gui.run()
    except RuntimeError as e:
        print(f"\nError: {e}")
        return
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")


if __name__ == "__main__":
    main()
