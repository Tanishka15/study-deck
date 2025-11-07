# Quick Start Guide - Eye Blink Detection System

## 🚀 5-Minute Setup

### 1. Install Python Dependencies
```bash
pip install opencv-python dlib scipy numpy Pillow
```

### 2. Download Face Model
```bash
# macOS/Linux
chmod +x setup.sh && ./setup.sh

# Windows
setup.bat

# Or manually
wget http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2
bunzip2 shape_predictor_68_face_landmarks.dat.bz2
```

### 3. Run the Application
```bash
# GUI Version (Recommended)
python blink_detector_gui.py

# Command Line Version
python blink_detector.py
```

---

## 🎮 Quick Controls

### GUI Mode
- **▶ Start**: Begin detection
- **⏸ Stop**: Pause detection  
- **🔄 Reset**: Clear counters
- **💾 Export**: Save data

### CLI Mode
- `q` - Quit
- `r` - Reset
- `s` - Save data

---

## ⚙️ Quick Settings

**For Sensitive Eyes (frequent blinks):**
- EAR Threshold: `0.27 - 0.30`
- Consecutive Frames: `2 - 3`

**For Normal Detection:**
- EAR Threshold: `0.23 - 0.25` (default)
- Consecutive Frames: `3 - 4`

**For Reduced False Positives:**
- EAR Threshold: `0.20 - 0.23`
- Consecutive Frames: `4 - 6`

---

## 📊 What the Numbers Mean

- **Total Blinks**: Count since session started
- **EAR**: Eye Aspect Ratio (lower = more closed)
- **Blink Rate (BPM)**: Blinks per minute (last 60 sec)
- **Avg Blink Rate**: Average for entire session
- **Normal Range**: 15-20 blinks/minute

---

## 🐛 Common Issues

**Camera not working?**
```python
# Edit blink_detector_gui.py, line ~195
self.cap = cv2.VideoCapture(1)  # Try 0, 1, 2
```

**Model not found?**
- Ensure `shape_predictor_68_face_landmarks.dat` is in the same folder
- Re-run setup script

**Poor detection?**
- Ensure good lighting
- Face camera directly
- Adjust EAR threshold

**dlib won't install?**
```bash
# Use conda instead
conda install -c conda-forge dlib
```

---

## 💡 Tips

1. **Good Lighting**: Essential for accurate detection
2. **Face Position**: Center your face in frame
3. **Calibration**: Adjust settings based on your blink pattern
4. **Regular Breaks**: Use for monitoring, not continuous use
5. **Data Export**: Save sessions for tracking over time

---

## 📖 Full Documentation

See [README.md](README.md) for complete documentation.

---

**Need Help?** Check the Troubleshooting section in README.md
