# Installation Instructions

## Platform-Specific Setup

### macOS

1. **Install Homebrew** (if not already installed):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install dependencies**:
   ```bash
   brew install cmake
   brew install python@3.11
   ```

3. **Create virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

4. **Install Python packages**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. **Download face model**:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

6. **Run application**:
   ```bash
   python blink_detector_gui.py
   ```

### macOS (Apple Silicon M1/M2/M3)

For Apple Silicon Macs, dlib may need special handling:

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install cmake via Homebrew
brew install cmake

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install numpy scipy Pillow opencv-python

# Install dlib with specific flags
pip install dlib --no-cache-dir

# Download model and run
./setup.sh
python blink_detector_gui.py
```

---

### Linux (Ubuntu/Debian)

1. **Update system**:
   ```bash
   sudo apt-get update
   sudo apt-get upgrade
   ```

2. **Install dependencies**:
   ```bash
   sudo apt-get install python3 python3-pip python3-venv
   sudo apt-get install cmake build-essential
   sudo apt-get install python3-dev
   sudo apt-get install libopencv-dev python3-opencv
   ```

3. **Create virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

4. **Install Python packages**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. **Download face model**:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

6. **Run application**:
   ```bash
   python blink_detector_gui.py
   ```

---

### Windows

#### Option 1: Using pip (Recommended for most users)

1. **Install Python** (3.8 or higher):
   - Download from [python.org](https://www.python.org/downloads/)
   - Check "Add Python to PATH" during installation

2. **Open Command Prompt or PowerShell**:
   ```cmd
   cd path\to\eye_blink
   ```

3. **Create virtual environment**:
   ```cmd
   python -m venv venv
   venv\Scripts\activate
   ```

4. **Install dependencies**:
   ```cmd
   pip install --upgrade pip
   pip install opencv-python numpy scipy Pillow
   ```

5. **Install dlib** (may take time):
   ```cmd
   pip install dlib
   ```
   
   **If dlib fails**, try pre-built wheels:
   - Visit: https://github.com/z-mahmud22/Dlib_Windows_Python3.x
   - Download appropriate wheel for your Python version
   - Install: `pip install dlib-19.xx.x-cpxx-cpxx-win_amd64.whl`

6. **Download face model**:
   ```cmd
   setup.bat
   ```
   
   Or manually:
   ```cmd
   curl -L -O http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2
   ```
   Then extract using 7-Zip or WinRAR

7. **Run application**:
   ```cmd
   python blink_detector_gui.py
   ```

#### Option 2: Using Anaconda/Miniconda (Easier for Windows)

1. **Install Anaconda** or **Miniconda**:
   - Download from [anaconda.com](https://www.anaconda.com/products/distribution)

2. **Open Anaconda Prompt**:
   ```cmd
   cd path\to\eye_blink
   ```

3. **Create conda environment**:
   ```cmd
   conda create -n blink_detect python=3.9
   conda activate blink_detect
   ```

4. **Install dependencies**:
   ```cmd
   conda install -c conda-forge opencv
   conda install -c conda-forge dlib
   conda install numpy scipy pillow
   ```

5. **Download model**:
   ```cmd
   setup.bat
   ```

6. **Run application**:
   ```cmd
   python blink_detector_gui.py
   ```

---

## Verifying Installation

After installation, verify everything works:

```bash
# Test imports
python -c "import cv2; import dlib; import numpy; import scipy; print('All imports successful!')"

# Check model file exists
ls -la shape_predictor_68_face_landmarks.dat  # macOS/Linux
dir shape_predictor_68_face_landmarks.dat      # Windows

# Run demo
python demo.py
```

---

## Common Installation Issues

### Issue: dlib won't compile

**Solution (Windows):**
- Use Anaconda: `conda install -c conda-forge dlib`
- Or download pre-built wheel

**Solution (macOS):**
```bash
brew install cmake
pip install dlib
```

**Solution (Linux):**
```bash
sudo apt-get install build-essential cmake
pip install dlib
```

### Issue: OpenCV camera not working

**Solution:**
- Grant camera permissions in system settings
- Try different camera index (0, 1, 2)
- Check if other apps are using camera

### Issue: Model file not downloading

**Solution:**
- Download manually: http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2
- Extract to project directory
- File should be exactly: `shape_predictor_68_face_landmarks.dat`

### Issue: Import errors

**Solution:**
- Ensure virtual environment is activated
- Reinstall packages: `pip install -r requirements.txt --force-reinstall`
- Check Python version: `python --version` (should be 3.8+)

---

## Quick Test

Run this to test your installation:

```python
import cv2
import dlib
import numpy as np
from scipy.spatial import distance

print("✓ All imports successful!")
print(f"OpenCV version: {cv2.__version__}")
print(f"NumPy version: {np.__version__}")

# Test camera
cap = cv2.VideoCapture(0)
if cap.isOpened():
    print("✓ Camera accessible")
    cap.release()
else:
    print("✗ Camera not accessible")

# Test model
try:
    detector = dlib.get_frontal_face_detector()
    predictor = dlib.shape_predictor("shape_predictor_68_face_landmarks.dat")
    print("✓ Face model loaded successfully")
except:
    print("✗ Face model not found or corrupted")
```

Save as `test_installation.py` and run: `python test_installation.py`

---

## Need Help?

- Check [README.md](README.md) for full documentation
- See [QUICKSTART.md](QUICKSTART.md) for quick guide
- Review troubleshooting section above
