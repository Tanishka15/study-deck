"""
Eye Blink Detection System with Professional GUI
Modern interface with real-time video, statistics, and controls
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import cv2
from PIL import Image, ImageTk
import threading
from blink_detector import EyeBlinkDetector
import time
from datetime import datetime


class BlinkDetectorGUI:
    """
    Professional GUI for Eye Blink Detection System
    """
    
    def __init__(self, root):
        """Initialize the GUI application"""
        self.root = root
        self.root.title("Eye Blink Detection System")
        self.root.geometry("1200x700")
        self.root.configure(bg='#1e1e1e')
        
        # Initialize detector
        try:
            self.detector = EyeBlinkDetector()
        except RuntimeError as e:
            messagebox.showerror("Error", str(e))
            self.root.quit()
            return
        
        # Video capture
        self.cap = None
        self.is_running = False
        self.video_thread = None
        
        # Alert sound flag
        self.drowsiness_alert_shown = False
        
        # Setup GUI
        self.setup_gui()
        
        # Bind close event
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
    
    def setup_gui(self):
        """Setup all GUI components"""
        # Title
        title_frame = tk.Frame(self.root, bg='#1e1e1e')
        title_frame.pack(fill=tk.X, padx=10, pady=10)
        
        title_label = tk.Label(
            title_frame, 
            text="👁️ Eye Blink Detection System",
            font=('Arial', 24, 'bold'),
            bg='#1e1e1e',
            fg='#00ff00'
        )
        title_label.pack()
        
        subtitle_label = tk.Label(
            title_frame,
            text="Advanced blink tracking with drowsiness detection",
            font=('Arial', 10),
            bg='#1e1e1e',
            fg='#888888'
        )
        subtitle_label.pack()
        
        # Main content frame
        content_frame = tk.Frame(self.root, bg='#1e1e1e')
        content_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        # Left side - Video display
        left_frame = tk.Frame(content_frame, bg='#2d2d2d', relief=tk.RAISED, borderwidth=2)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 5))
        
        video_label = tk.Label(left_frame, text="Video Feed", font=('Arial', 12, 'bold'),
                              bg='#2d2d2d', fg='white')
        video_label.pack(pady=5)
        
        self.video_display = tk.Label(left_frame, bg='black')
        self.video_display.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Right side - Controls and statistics
        right_frame = tk.Frame(content_frame, bg='#2d2d2d', width=350)
        right_frame.pack(side=tk.RIGHT, fill=tk.Y, padx=(5, 0))
        right_frame.pack_propagate(False)
        
        # Statistics Panel
        stats_frame = tk.LabelFrame(
            right_frame, 
            text="📊 Statistics",
            font=('Arial', 12, 'bold'),
            bg='#2d2d2d',
            fg='#00ff00',
            relief=tk.RAISED,
            borderwidth=2
        )
        stats_frame.pack(fill=tk.X, padx=10, pady=10)
        
        # Stats labels
        self.stats_labels = {}
        stats_items = [
            ('total_blinks', 'Total Blinks:', '0'),
            ('current_ear', 'Eye Aspect Ratio:', '0.000'),
            ('status', 'Status:', 'Not Started'),
            ('blink_rate', 'Blink Rate (BPM):', '0.00'),
            ('avg_blink_rate', 'Avg Blink Rate:', '0.00'),
            ('session_time', 'Session Time:', '0s')
        ]
        
        for key, label_text, default_value in stats_items:
            frame = tk.Frame(stats_frame, bg='#2d2d2d')
            frame.pack(fill=tk.X, padx=10, pady=5)
            
            tk.Label(
                frame,
                text=label_text,
                font=('Arial', 10, 'bold'),
                bg='#2d2d2d',
                fg='#aaaaaa',
                anchor='w'
            ).pack(side=tk.LEFT)
            
            value_label = tk.Label(
                frame,
                text=default_value,
                font=('Arial', 10),
                bg='#2d2d2d',
                fg='white',
                anchor='e'
            )
            value_label.pack(side=tk.RIGHT)
            self.stats_labels[key] = value_label
        
        # Drowsiness Alert
        self.alert_label = tk.Label(
            stats_frame,
            text="",
            font=('Arial', 12, 'bold'),
            bg='#2d2d2d',
            fg='red'
        )
        self.alert_label.pack(pady=10)
        
        # Settings Panel
        settings_frame = tk.LabelFrame(
            right_frame,
            text="⚙️ Settings",
            font=('Arial', 12, 'bold'),
            bg='#2d2d2d',
            fg='#00ff00',
            relief=tk.RAISED,
            borderwidth=2
        )
        settings_frame.pack(fill=tk.X, padx=10, pady=10)
        
        # EAR Threshold slider
        tk.Label(
            settings_frame,
            text="EAR Threshold:",
            font=('Arial', 9),
            bg='#2d2d2d',
            fg='#aaaaaa'
        ).pack(anchor='w', padx=10, pady=(10, 0))
        
        self.ear_threshold_var = tk.DoubleVar(value=0.25)
        self.ear_slider = tk.Scale(
            settings_frame,
            from_=0.15,
            to=0.35,
            resolution=0.01,
            orient=tk.HORIZONTAL,
            variable=self.ear_threshold_var,
            command=self.update_ear_threshold,
            bg='#2d2d2d',
            fg='white',
            highlightbackground='#2d2d2d',
            troughcolor='#1e1e1e'
        )
        self.ear_slider.pack(fill=tk.X, padx=10, pady=(0, 10))
        
        # Consecutive frames slider
        tk.Label(
            settings_frame,
            text="Consecutive Frames:",
            font=('Arial', 9),
            bg='#2d2d2d',
            fg='#aaaaaa'
        ).pack(anchor='w', padx=10)
        
        self.consec_frames_var = tk.IntVar(value=3)
        self.frames_slider = tk.Scale(
            settings_frame,
            from_=1,
            to=10,
            orient=tk.HORIZONTAL,
            variable=self.consec_frames_var,
            command=self.update_consec_frames,
            bg='#2d2d2d',
            fg='white',
            highlightbackground='#2d2d2d',
            troughcolor='#1e1e1e'
        )
        self.frames_slider.pack(fill=tk.X, padx=10, pady=(0, 10))
        
        # Drowsiness threshold slider
        tk.Label(
            settings_frame,
            text="Drowsiness Time (s):",
            font=('Arial', 9),
            bg='#2d2d2d',
            fg='#aaaaaa'
        ).pack(anchor='w', padx=10)
        
        self.drowsiness_var = tk.DoubleVar(value=1.5)
        self.drowsiness_slider = tk.Scale(
            settings_frame,
            from_=0.5,
            to=5.0,
            resolution=0.1,
            orient=tk.HORIZONTAL,
            variable=self.drowsiness_var,
            command=self.update_drowsiness_threshold,
            bg='#2d2d2d',
            fg='white',
            highlightbackground='#2d2d2d',
            troughcolor='#1e1e1e'
        )
        self.drowsiness_slider.pack(fill=tk.X, padx=10, pady=(0, 10))
        
        # Control buttons
        control_frame = tk.Frame(right_frame, bg='#2d2d2d')
        control_frame.pack(fill=tk.X, padx=10, pady=10)
        
        button_style = {
            'font': ('Arial', 11, 'bold'),
            'relief': tk.RAISED,
            'borderwidth': 2,
            'cursor': 'hand2'
        }
        
        self.start_button = tk.Button(
            control_frame,
            text="▶ Start",
            command=self.start_detection,
            bg='#00aa00',
            fg='white',
            activebackground='#00ff00',
            **button_style
        )
        self.start_button.pack(fill=tk.X, pady=5)
        
        self.stop_button = tk.Button(
            control_frame,
            text="⏸ Stop",
            command=self.stop_detection,
            bg='#cc6600',
            fg='white',
            activebackground='#ff8800',
            state=tk.DISABLED,
            **button_style
        )
        self.stop_button.pack(fill=tk.X, pady=5)
        
        self.reset_button = tk.Button(
            control_frame,
            text="🔄 Reset",
            command=self.reset_counters,
            bg='#0066cc',
            fg='white',
            activebackground='#0088ff',
            **button_style
        )
        self.reset_button.pack(fill=tk.X, pady=5)
        
        self.export_button = tk.Button(
            control_frame,
            text="💾 Export Data",
            command=self.export_data,
            bg='#6600cc',
            fg='white',
            activebackground='#8800ff',
            **button_style
        )
        self.export_button.pack(fill=tk.X, pady=5)
        
        # Status bar
        status_frame = tk.Frame(self.root, bg='#2d2d2d', relief=tk.SUNKEN, borderwidth=1)
        status_frame.pack(side=tk.BOTTOM, fill=tk.X)
        
        self.status_label = tk.Label(
            status_frame,
            text="Ready to start detection",
            font=('Arial', 9),
            bg='#2d2d2d',
            fg='#aaaaaa',
            anchor='w'
        )
        self.status_label.pack(side=tk.LEFT, padx=10, pady=2)
        
        # Version info
        tk.Label(
            status_frame,
            text="v1.0",
            font=('Arial', 8),
            bg='#2d2d2d',
            fg='#666666'
        ).pack(side=tk.RIGHT, padx=10)
    
    def update_ear_threshold(self, value):
        """Update EAR threshold"""
        self.detector.ear_threshold = float(value)
    
    def update_consec_frames(self, value):
        """Update consecutive frames threshold"""
        self.detector.consec_frames = int(value)
    
    def update_drowsiness_threshold(self, value):
        """Update drowsiness threshold"""
        self.detector.drowsiness_threshold = float(value)
    
    def start_detection(self):
        """Start the detection process"""
        if self.is_running:
            return
        
        # Open webcam
        self.cap = cv2.VideoCapture(0)
        if not self.cap.isOpened():
            messagebox.showerror("Error", "Cannot access webcam")
            return
        
        self.is_running = True
        self.start_button.config(state=tk.DISABLED)
        self.stop_button.config(state=tk.NORMAL)
        self.status_label.config(text="Detection running...", fg='#00ff00')
        
        # Start video thread
        self.video_thread = threading.Thread(target=self.video_loop, daemon=True)
        self.video_thread.start()
    
    def stop_detection(self):
        """Stop the detection process"""
        self.is_running = False
        
        if self.cap is not None:
            self.cap.release()
            self.cap = None
        
        self.start_button.config(state=tk.NORMAL)
        self.stop_button.config(state=tk.DISABLED)
        self.status_label.config(text="Detection stopped", fg='#ffaa00')
        
        # Clear video display
        self.video_display.config(image='')
    
    def video_loop(self):
        """Main video processing loop"""
        while self.is_running:
            ret, frame = self.cap.read()
            if not ret:
                break
            
            # Detect blinks
            frame, blink_detected, is_drowsy = self.detector.detect_blink(frame)
            
            # Update statistics
            self.update_statistics(is_drowsy)
            
            # Convert frame for display
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frame = cv2.resize(frame, (640, 480))
            image = Image.fromarray(frame)
            photo = ImageTk.PhotoImage(image=image)
            
            # Update video display
            self.video_display.config(image=photo)
            self.video_display.image = photo
            
            time.sleep(0.03)  # ~30 FPS
    
    def update_statistics(self, is_drowsy):
        """Update statistics display"""
        stats = self.detector.get_stats()
        
        self.stats_labels['total_blinks'].config(text=str(stats['total_blinks']))
        self.stats_labels['current_ear'].config(text=f"{stats['current_ear']:.3f}")
        
        # Color code status
        status_color = 'red' if is_drowsy else '#00ff00' if stats['status'] == 'Eyes Open' else '#ffaa00'
        self.stats_labels['status'].config(text=stats['status'], fg=status_color)
        
        self.stats_labels['blink_rate'].config(text=f"{stats['blink_rate']:.2f}")
        self.stats_labels['avg_blink_rate'].config(text=f"{stats['avg_blink_rate']:.2f}")
        self.stats_labels['session_time'].config(text=f"{stats['session_duration']:.1f}s")
        
        # Show drowsiness alert
        if is_drowsy:
            self.alert_label.config(text="⚠️ DROWSINESS ALERT! ⚠️")
            if not self.drowsiness_alert_shown:
                self.root.bell()  # System beep
                self.drowsiness_alert_shown = True
        else:
            self.alert_label.config(text="")
            self.drowsiness_alert_shown = False
    
    def reset_counters(self):
        """Reset all counters"""
        if messagebox.askyesno("Confirm Reset", "Are you sure you want to reset all counters?"):
            self.detector.reset()
            self.status_label.config(text="Counters reset", fg='#00ff00')
            messagebox.showinfo("Success", "All counters have been reset")
    
    def export_data(self):
        """Export data to file"""
        if self.detector.total_blinks == 0:
            messagebox.showwarning("No Data", "No blink data to export")
            return
        
        # Ask for filename
        filename = filedialog.asksaveasfilename(
            defaultextension=".csv",
            filetypes=[("CSV files", "*.csv"), ("All files", "*.*")],
            initialfile=f"blink_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        )
        
        if filename:
            try:
                filepath = self.detector.export_data(filename)
                messagebox.showinfo(
                    "Export Successful",
                    f"Data exported successfully!\n\nFiles created:\n- {filename}\n- {filename.replace('.csv', '_summary.txt')}"
                )
                self.status_label.config(text=f"Data exported to {filename}", fg='#00ff00')
            except Exception as e:
                messagebox.showerror("Export Error", f"Error exporting data:\n{str(e)}")
    
    def on_closing(self):
        """Handle window closing"""
        if self.is_running:
            if messagebox.askyesno("Quit", "Detection is running. Do you want to quit?"):
                self.stop_detection()
                self.root.destroy()
        else:
            self.root.destroy()


def main():
    """Main entry point for GUI application"""
    root = tk.Tk()
    app = BlinkDetectorGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
