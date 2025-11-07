"""
Eye Blink Detection and Counting System
Uses facial landmarks to detect eye blinks with advanced features
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


class EyeBlinkDetector:
    """
    Advanced Eye Blink Detection System
    Features: Blink counting, rate calculation, drowsiness detection, data export
    """
    
    # Eye landmark indices (68-point facial landmarks)
    LEFT_EYE_INDICES = list(range(36, 42))
    RIGHT_EYE_INDICES = list(range(42, 48))
    
    def __init__(self, 
                 ear_threshold=0.25, 
                 consec_frames=3,
                 drowsiness_threshold=1.5,
                 predictor_path="shape_predictor_68_face_landmarks.dat"):
        """
        Initialize the Eye Blink Detector
        
        Args:
            ear_threshold: Eye Aspect Ratio threshold for blink detection
            consec_frames: Consecutive frames below threshold to count as blink
            drowsiness_threshold: Time in seconds eyes closed to trigger drowsiness
            predictor_path: Path to dlib facial landmark predictor
        """
        self.ear_threshold = ear_threshold
        self.consec_frames = consec_frames
        self.drowsiness_threshold = drowsiness_threshold
        
        # Initialize dlib face detector and landmark predictor
        try:
            self.detector = dlib.get_frontal_face_detector()
            self.predictor = dlib.shape_predictor(predictor_path)
        except RuntimeError as e:
            raise RuntimeError(
                f"Error loading facial landmark predictor: {e}\n"
                f"Please download the model from:\n"
                f"http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2"
            )
        
        # Blink tracking variables
        self.total_blinks = 0
        self.frame_counter = 0
        self.blink_start_time = None
        self.eyes_closed_start = None
        self.is_drowsy = False
        
        # Blink rate tracking
        self.blink_times = deque(maxlen=100)  # Store last 100 blink timestamps
        self.session_start_time = time.time()
        
        # Data logging
        self.blink_data = []
        
        # Status variables
        self.current_ear = 0.0
        self.status = "Eyes Open"
        
    def calculate_ear(self, eye_landmarks):
        """
        Calculate Eye Aspect Ratio (EAR)
        
        EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
        where p1-p6 are eye landmark points
        
        Args:
            eye_landmarks: Array of eye landmark coordinates
            
        Returns:
            float: Eye Aspect Ratio
        """
        # Vertical eye landmarks distances
        A = distance.euclidean(eye_landmarks[1], eye_landmarks[5])
        B = distance.euclidean(eye_landmarks[2], eye_landmarks[4])
        
        # Horizontal eye landmark distance
        C = distance.euclidean(eye_landmarks[0], eye_landmarks[3])
        
        # Eye Aspect Ratio
        ear = (A + B) / (2.0 * C)
        return ear
    
    def get_eye_landmarks(self, landmarks, eye_indices):
        """
        Extract eye landmark coordinates
        
        Args:
            landmarks: Full facial landmarks
            eye_indices: Indices for specific eye
            
        Returns:
            numpy array: Eye landmark coordinates
        """
        return np.array([(landmarks.part(i).x, landmarks.part(i).y) 
                        for i in eye_indices])
    
    def detect_blink(self, frame):
        """
        Detect blinks in a video frame
        
        Args:
            frame: Video frame (BGR format)
            
        Returns:
            tuple: (processed_frame, blink_detected, is_drowsy)
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.detector(gray, 0)
        
        blink_detected = False
        
        if len(faces) == 0:
            self.status = "No Face Detected"
            return frame, False, False
        
        for face in faces:
            landmarks = self.predictor(gray, face)
            
            # Get eye landmarks
            left_eye = self.get_eye_landmarks(landmarks, self.LEFT_EYE_INDICES)
            right_eye = self.get_eye_landmarks(landmarks, self.RIGHT_EYE_INDICES)
            
            # Calculate EAR for both eyes
            left_ear = self.calculate_ear(left_eye)
            right_ear = self.calculate_ear(right_eye)
            self.current_ear = (left_ear + right_ear) / 2.0
            
            # Draw eye contours
            left_eye_hull = cv2.convexHull(left_eye)
            right_eye_hull = cv2.convexHull(right_eye)
            cv2.drawContours(frame, [left_eye_hull], -1, (0, 255, 0), 1)
            cv2.drawContours(frame, [right_eye_hull], -1, (0, 255, 0), 1)
            
            # Blink detection logic
            if self.current_ear < self.ear_threshold:
                self.frame_counter += 1
                self.status = "Eyes Closed"
                
                # Track drowsiness
                if self.eyes_closed_start is None:
                    self.eyes_closed_start = time.time()
                elif time.time() - self.eyes_closed_start > self.drowsiness_threshold:
                    self.is_drowsy = True
                    self.status = "DROWSY ALERT!"
            else:
                # Eyes opened
                if self.frame_counter >= self.consec_frames:
                    self.total_blinks += 1
                    blink_detected = True
                    current_time = time.time()
                    self.blink_times.append(current_time)
                    
                    # Log blink data
                    self.blink_data.append({
                        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3],
                        'blink_number': self.total_blinks,
                        'ear_value': round(self.current_ear, 3),
                        'duration_frames': self.frame_counter
                    })
                
                self.frame_counter = 0
                self.eyes_closed_start = None
                self.is_drowsy = False
                self.status = "Eyes Open"
        
        return frame, blink_detected, self.is_drowsy
    
    def get_blink_rate(self):
        """
        Calculate blinks per minute
        
        Returns:
            float: Blinks per minute
        """
        if len(self.blink_times) < 2:
            return 0.0
        
        # Calculate blinks in last 60 seconds
        current_time = time.time()
        recent_blinks = [t for t in self.blink_times if current_time - t <= 60]
        
        if len(recent_blinks) < 2:
            return 0.0
        
        time_span = current_time - recent_blinks[0]
        if time_span > 0:
            return (len(recent_blinks) / time_span) * 60
        return 0.0
    
    def get_average_blink_rate(self):
        """
        Calculate average blinks per minute for entire session
        
        Returns:
            float: Average blinks per minute
        """
        elapsed_time = time.time() - self.session_start_time
        if elapsed_time > 0:
            return (self.total_blinks / elapsed_time) * 60
        return 0.0
    
    def export_data(self, filename=None):
        """
        Export blink data to CSV file
        
        Args:
            filename: Output filename (default: auto-generated with timestamp)
            
        Returns:
            str: Path to exported file
        """
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
        
        # Also write summary statistics
        summary_file = filepath.replace('.csv', '_summary.txt')
        with open(summary_file, 'w') as f:
            f.write("=== Eye Blink Detection Session Summary ===\n\n")
            f.write(f"Total Blinks: {self.total_blinks}\n")
            f.write(f"Session Duration: {time.time() - self.session_start_time:.2f} seconds\n")
            f.write(f"Average Blink Rate: {self.get_average_blink_rate():.2f} blinks/minute\n")
            f.write(f"Current Blink Rate: {self.get_blink_rate():.2f} blinks/minute\n")
        
        return filepath
    
    def reset(self):
        """Reset all counters and data"""
        self.total_blinks = 0
        self.frame_counter = 0
        self.blink_times.clear()
        self.blink_data.clear()
        self.session_start_time = time.time()
        self.is_drowsy = False
        self.status = "Eyes Open"
    
    def get_stats(self):
        """
        Get current statistics
        
        Returns:
            dict: Statistics dictionary
        """
        return {
            'total_blinks': self.total_blinks,
            'current_ear': round(self.current_ear, 3),
            'status': self.status,
            'blink_rate': round(self.get_blink_rate(), 2),
            'avg_blink_rate': round(self.get_average_blink_rate(), 2),
            'is_drowsy': self.is_drowsy,
            'session_duration': round(time.time() - self.session_start_time, 2)
        }


def main():
    """
    Main function for command-line interface
    """
    print("=== Eye Blink Detection System ===")
    print("Initializing...")
    
    try:
        detector = EyeBlinkDetector()
    except RuntimeError as e:
        print(f"\nError: {e}")
        return
    
    # Open webcam
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Cannot access webcam")
        return
    
    print("\nSystem ready!")
    print("Controls:")
    print("  'q' - Quit")
    print("  'r' - Reset counters")
    print("  's' - Save data to file")
    print("\n")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Detect blinks
        frame, blink_detected, is_drowsy = detector.detect_blink(frame)
        stats = detector.get_stats()
        
        # Display information on frame
        y_offset = 30
        cv2.putText(frame, f"Blinks: {stats['total_blinks']}", (10, y_offset),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        y_offset += 30
        cv2.putText(frame, f"EAR: {stats['current_ear']}", (10, y_offset),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        y_offset += 30
        status_color = (0, 0, 255) if is_drowsy else (0, 255, 0)
        cv2.putText(frame, f"Status: {stats['status']}", (10, y_offset),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)
        
        y_offset += 30
        cv2.putText(frame, f"Blink Rate: {stats['blink_rate']:.1f} BPM", (10, y_offset),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # Show drowsiness alert
        if is_drowsy:
            cv2.putText(frame, "DROWSINESS DETECTED!", 
                       (frame.shape[1]//2 - 200, frame.shape[0]//2),
                       cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
        
        cv2.imshow("Eye Blink Detection", frame)
        
        # Handle key presses
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('r'):
            detector.reset()
            print("Counters reset!")
        elif key == ord('s'):
            filepath = detector.export_data()
            print(f"Data saved to: {filepath}")
    
    # Cleanup
    cap.release()
    cv2.destroyAllWindows()
    
    # Final export
    print("\nExporting final data...")
    filepath = detector.export_data()
    print(f"Data saved to: {filepath}")
    
    # Display final statistics
    stats = detector.get_stats()
    print("\n=== Session Statistics ===")
    print(f"Total Blinks: {stats['total_blinks']}")
    print(f"Session Duration: {stats['session_duration']:.2f} seconds")
    print(f"Average Blink Rate: {stats['avg_blink_rate']:.2f} blinks/minute")


if __name__ == "__main__":
    main()
