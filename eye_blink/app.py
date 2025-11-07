"""
Flask Web Application for Eye Blink Detection
Modern web-based frontend with real-time video streaming
"""

from flask import Flask, render_template, Response, jsonify, request
import cv2
import json
from blink_detector import EyeBlinkDetector
import threading
import time

app = Flask(__name__)

# Global detector instance
detector = None
cap = None
detection_active = False
lock = threading.Lock()

def initialize_detector():
    """Initialize the blink detector"""
    global detector, cap
    try:
        detector = EyeBlinkDetector()
        cap = cv2.VideoCapture(0)
        return True
    except Exception as e:
        print(f"Error initializing detector: {e}")
        return False

def generate_frames():
    """Generate video frames with blink detection"""
    global detector, cap, detection_active
    
    while True:
        if not detection_active or cap is None:
            time.sleep(0.1)
            continue
            
        success, frame = cap.read()
        if not success:
            break
        
        with lock:
            # Detect blinks
            frame, blink_detected, is_drowsy = detector.detect_blink(frame)
        
        # Encode frame
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        frame_bytes = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    """Video streaming route"""
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/start', methods=['POST'])
def start_detection():
    """Start blink detection"""
    global detection_active, cap
    
    if cap is None or not cap.isOpened():
        if not initialize_detector():
            return jsonify({'success': False, 'message': 'Failed to initialize camera'})
    
    detection_active = True
    return jsonify({'success': True, 'message': 'Detection started'})

@app.route('/api/stop', methods=['POST'])
def stop_detection():
    """Stop blink detection"""
    global detection_active
    detection_active = False
    return jsonify({'success': True, 'message': 'Detection stopped'})

@app.route('/api/reset', methods=['POST'])
def reset_counters():
    """Reset all counters"""
    global detector
    with lock:
        detector.reset()
    return jsonify({'success': True, 'message': 'Counters reset'})

@app.route('/api/stats')
def get_stats():
    """Get current statistics"""
    global detector
    with lock:
        stats = detector.get_stats()
    return jsonify(stats)

@app.route('/api/export', methods=['POST'])
def export_data():
    """Export data to CSV"""
    global detector
    with lock:
        try:
            filepath = detector.export_data()
            return jsonify({'success': True, 'filepath': filepath})
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)})

@app.route('/api/settings', methods=['POST'])
def update_settings():
    """Update detection settings"""
    global detector
    data = request.json
    
    with lock:
        if 'ear_threshold' in data:
            detector.ear_threshold = float(data['ear_threshold'])
        if 'consec_frames' in data:
            detector.consec_frames = int(data['consec_frames'])
        if 'drowsiness_threshold' in data:
            detector.drowsiness_threshold = float(data['drowsiness_threshold'])
    
    return jsonify({'success': True, 'message': 'Settings updated'})

if __name__ == '__main__':
    print("=" * 50)
    print("Eye Blink Detection - Web Interface")
    print("=" * 50)
    print("\nInitializing...")
    
    if initialize_detector():
        print("✓ System initialized successfully!")
        print("\n🌐 Starting web server...")
        print("📱 Open your browser and go to:")
        print("\n   http://localhost:5001\n")
        print("Press Ctrl+C to stop the server\n")
        
        app.run(debug=False, threaded=True, host='0.0.0.0', port=5001)
    else:
        print("✗ Failed to initialize system")
        print("Please check:")
        print("  - Webcam is connected")
        print("  - shape_predictor_68_face_landmarks.dat exists")
