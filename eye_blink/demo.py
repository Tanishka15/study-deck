"""
Example/Demo Script - Eye Blink Detection
Demonstrates basic usage and features
"""

import cv2
from blink_detector import EyeBlinkDetector
import time


def demo_basic_detection():
    """Demo: Basic blink detection"""
    print("=" * 50)
    print("DEMO 1: Basic Blink Detection")
    print("=" * 50)
    print("\nThis demo shows basic blink counting.")
    print("Press 'q' to continue to next demo.\n")
    
    detector = EyeBlinkDetector(ear_threshold=0.25, consec_frames=3)
    cap = cv2.VideoCapture(0)
    
    start_time = time.time()
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        frame, blink_detected, _ = detector.detect_blink(frame)
        
        # Simple on-screen display
        cv2.putText(frame, f"Blinks: {detector.total_blinks}", 
                   (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.putText(frame, f"EAR: {detector.current_ear:.3f}", 
                   (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        cv2.imshow("Demo 1: Basic Detection", frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()
    
    print(f"\nDemo 1 Results:")
    print(f"  Total Blinks: {detector.total_blinks}")
    print(f"  Duration: {time.time() - start_time:.1f}s")
    print()


def demo_blink_rate():
    """Demo: Blink rate calculation"""
    print("=" * 50)
    print("DEMO 2: Blink Rate Monitoring")
    print("=" * 50)
    print("\nThis demo calculates your blink rate in real-time.")
    print("Normal blink rate: 15-20 blinks/minute")
    print("Press 'q' to continue to next demo.\n")
    
    detector = EyeBlinkDetector()
    cap = cv2.VideoCapture(0)
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        frame, _, _ = detector.detect_blink(frame)
        stats = detector.get_stats()
        
        # Display blink rate information
        cv2.putText(frame, f"Blinks: {stats['total_blinks']}", 
                   (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(frame, f"Current Rate: {stats['blink_rate']:.1f} BPM", 
                   (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(frame, f"Average Rate: {stats['avg_blink_rate']:.1f} BPM", 
                   (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # Color code based on rate
        if stats['blink_rate'] < 10:
            rate_status = "Low (Concentrated)"
            color = (0, 165, 255)  # Orange
        elif stats['blink_rate'] > 25:
            rate_status = "High (Stressed)"
            color = (0, 0, 255)  # Red
        else:
            rate_status = "Normal"
            color = (0, 255, 0)  # Green
        
        cv2.putText(frame, rate_status, (10, 120), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        
        cv2.imshow("Demo 2: Blink Rate", frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()
    
    stats = detector.get_stats()
    print(f"\nDemo 2 Results:")
    print(f"  Total Blinks: {stats['total_blinks']}")
    print(f"  Average Rate: {stats['avg_blink_rate']:.2f} blinks/minute")
    print()


def demo_drowsiness_detection():
    """Demo: Drowsiness detection"""
    print("=" * 50)
    print("DEMO 3: Drowsiness Detection")
    print("=" * 50)
    print("\nThis demo detects prolonged eye closure.")
    print("Try closing your eyes for >1.5 seconds.")
    print("Press 'q' to finish demos.\n")
    
    detector = EyeBlinkDetector(drowsiness_threshold=1.5)
    cap = cv2.VideoCapture(0)
    
    drowsy_count = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        frame, _, is_drowsy = detector.detect_blink(frame)
        
        if is_drowsy:
            drowsy_count += 1
            # Big red warning
            cv2.putText(frame, "DROWSY!", 
                       (frame.shape[1]//2 - 100, frame.shape[0]//2),
                       cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 255), 4)
            # Red overlay
            overlay = frame.copy()
            cv2.rectangle(overlay, (0, 0), (frame.shape[1], frame.shape[0]), 
                         (0, 0, 255), -1)
            frame = cv2.addWeighted(frame, 0.7, overlay, 0.3, 0)
        
        cv2.putText(frame, f"Status: {detector.status}", 
                   (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(frame, f"Drowsy Events: {drowsy_count}", 
                   (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        cv2.imshow("Demo 3: Drowsiness Detection", frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()
    
    print(f"\nDemo 3 Results:")
    print(f"  Drowsy Events: {drowsy_count}")
    print(f"  Total Blinks: {detector.total_blinks}")
    print()


def demo_data_export():
    """Demo: Data export feature"""
    print("=" * 50)
    print("DEMO 4: Data Export")
    print("=" * 50)
    print("\nThis demo shows data export functionality.")
    print("Blink a few times, then we'll export the data.\n")
    
    detector = EyeBlinkDetector()
    cap = cv2.VideoCapture(0)
    
    # Short recording session
    duration = 10  # seconds
    start_time = time.time()
    
    while time.time() - start_time < duration:
        ret, frame = cap.read()
        if not ret:
            break
        
        frame, _, _ = detector.detect_blink(frame)
        
        remaining = int(duration - (time.time() - start_time))
        cv2.putText(frame, f"Recording: {remaining}s", 
                   (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.putText(frame, f"Blinks: {detector.total_blinks}", 
                   (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        cv2.imshow("Demo 4: Recording", frame)
        cv2.waitKey(1)
    
    cap.release()
    cv2.destroyAllWindows()
    
    # Export data
    if detector.total_blinks > 0:
        print("\nExporting data...")
        filepath = detector.export_data("demo_export.csv")
        print(f"✓ Data exported to: {filepath}")
        print(f"✓ Summary saved to: {filepath.replace('.csv', '_summary.txt')}")
        
        # Show sample data
        print("\nSample of exported data:")
        if detector.blink_data:
            print(f"  First blink: {detector.blink_data[0]}")
            if len(detector.blink_data) > 1:
                print(f"  Last blink:  {detector.blink_data[-1]}")
    else:
        print("\nNo blinks detected during recording.")
    
    print()


def main():
    """Run all demos"""
    print("\n")
    print("╔═══════════════════════════════════════════════════╗")
    print("║   Eye Blink Detection System - Demo Suite        ║")
    print("╚═══════════════════════════════════════════════════╝")
    print("\nThis demo will showcase all features of the system.")
    print("Make sure your webcam is connected and working.\n")
    
    try:
        input("Press Enter to start Demo 1...")
        demo_basic_detection()
        
        input("Press Enter to start Demo 2...")
        demo_blink_rate()
        
        input("Press Enter to start Demo 3...")
        demo_drowsiness_detection()
        
        input("Press Enter to start Demo 4...")
        demo_data_export()
        
        print("=" * 50)
        print("All demos completed!")
        print("=" * 50)
        print("\nNow try the full application:")
        print("  python blink_detector_gui.py")
        print("\nHave fun! 👁️\n")
        
    except KeyboardInterrupt:
        print("\n\nDemo interrupted by user.")
    except Exception as e:
        print(f"\n\nError: {e}")
        print("Please ensure:")
        print("  1. Webcam is connected")
        print("  2. shape_predictor_68_face_landmarks.dat is present")
        print("  3. All dependencies are installed")


if __name__ == "__main__":
    main()
