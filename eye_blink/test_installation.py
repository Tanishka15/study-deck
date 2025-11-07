"""
Test Installation Script
Verifies all components are properly installed
"""

import sys
import os


def test_imports():
    """Test if all required packages can be imported"""
    print("Testing package imports...")
    results = {}
    
    packages = {
        'cv2': 'OpenCV',
        'dlib': 'dlib',
        'numpy': 'NumPy',
        'scipy': 'SciPy',
        'PIL': 'Pillow'
    }
    
    for package, name in packages.items():
        try:
            __import__(package)
            results[name] = '✓'
            print(f"  ✓ {name}")
        except ImportError:
            results[name] = '✗'
            print(f"  ✗ {name} - NOT FOUND")
    
    return all(v == '✓' for v in results.values())


def test_versions():
    """Print versions of installed packages"""
    print("\nPackage versions:")
    
    try:
        import cv2
        print(f"  OpenCV: {cv2.__version__}")
    except:
        print("  OpenCV: Not available")
    
    try:
        import numpy as np
        print(f"  NumPy: {np.__version__}")
    except:
        print("  NumPy: Not available")
    
    try:
        import scipy
        print(f"  SciPy: {scipy.__version__}")
    except:
        print("  SciPy: Not available")
    
    try:
        import PIL
        print(f"  Pillow: {PIL.__version__}")
    except:
        print("  Pillow: Not available")
    
    print(f"  Python: {sys.version.split()[0]}")


def test_model_file():
    """Test if facial landmark model file exists"""
    print("\nTesting model file...")
    
    model_path = "shape_predictor_68_face_landmarks.dat"
    
    if os.path.exists(model_path):
        size_mb = os.path.getsize(model_path) / (1024 * 1024)
        print(f"  ✓ Model file found ({size_mb:.1f} MB)")
        
        # Try to load it
        try:
            import dlib
            predictor = dlib.shape_predictor(model_path)
            print(f"  ✓ Model loads successfully")
            return True
        except Exception as e:
            print(f"  ✗ Model file corrupted: {e}")
            return False
    else:
        print(f"  ✗ Model file not found")
        print(f"  Run setup script to download:")
        print(f"    macOS/Linux: ./setup.sh")
        print(f"    Windows: setup.bat")
        return False


def test_camera():
    """Test if camera is accessible"""
    print("\nTesting camera access...")
    
    try:
        import cv2
        
        # Try primary camera
        cap = cv2.VideoCapture(0)
        
        if cap.isOpened():
            ret, frame = cap.read()
            if ret:
                h, w = frame.shape[:2]
                print(f"  ✓ Camera accessible (Resolution: {w}x{h})")
                cap.release()
                return True
            else:
                print(f"  ✗ Camera opened but cannot read frames")
                cap.release()
                return False
        else:
            print(f"  ✗ Cannot open camera")
            print(f"  Try:")
            print(f"    - Check camera permissions")
            print(f"    - Close other apps using camera")
            print(f"    - Try different camera index (1, 2, etc.)")
            return False
            
    except Exception as e:
        print(f"  ✗ Camera test failed: {e}")
        return False


def test_face_detection():
    """Test face detection functionality"""
    print("\nTesting face detection...")
    
    try:
        import dlib
        import cv2
        import numpy as np
        
        detector = dlib.get_frontal_face_detector()
        print(f"  ✓ Face detector initialized")
        
        # Create a simple test image
        test_image = np.zeros((480, 640, 3), dtype=np.uint8)
        gray = cv2.cvtColor(test_image, cv2.COLOR_BGR2GRAY)
        faces = detector(gray, 0)
        
        print(f"  ✓ Face detection functional (found {len(faces)} faces in test image)")
        return True
        
    except Exception as e:
        print(f"  ✗ Face detection test failed: {e}")
        return False


def test_blink_detector():
    """Test if blink detector module can be imported"""
    print("\nTesting blink detector module...")
    
    try:
        from blink_detector import EyeBlinkDetector
        detector = EyeBlinkDetector()
        print(f"  ✓ Blink detector initialized")
        print(f"  ✓ EAR threshold: {detector.ear_threshold}")
        print(f"  ✓ Consecutive frames: {detector.consec_frames}")
        return True
    except Exception as e:
        print(f"  ✗ Blink detector test failed: {e}")
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("  Eye Blink Detection System - Installation Test")
    print("=" * 60)
    print()
    
    results = {
        'Imports': test_imports(),
        'Model File': test_model_file(),
        'Camera': test_camera(),
        'Face Detection': test_face_detection(),
        'Blink Detector': test_blink_detector()
    }
    
    # Version info
    test_versions()
    
    # Summary
    print("\n" + "=" * 60)
    print("  Test Summary")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"  {test_name:20s}: {status}")
    
    all_passed = all(results.values())
    
    print("\n" + "=" * 60)
    if all_passed:
        print("  🎉 All tests passed! System is ready to use.")
        print("=" * 60)
        print("\n  Run the application:")
        print("    python blink_detector_gui.py  (GUI version)")
        print("    python blink_detector.py      (CLI version)")
        print("    python demo.py                (Demo mode)")
    else:
        print("  ⚠️  Some tests failed. Please fix the issues above.")
        print("=" * 60)
        print("\n  Installation help:")
        print("    - See INSTALL.md for detailed instructions")
        print("    - See README.md for troubleshooting")
        print("    - Run: pip install -r requirements.txt")
        
        if not results['Model File']:
            print("    - Run setup script to download model:")
            print("      macOS/Linux: ./setup.sh")
            print("      Windows: setup.bat")
    
    print()
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
