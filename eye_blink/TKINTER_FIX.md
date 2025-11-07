# Fixing tkinter on macOS

## Problem
The GUI application fails with: `ModuleNotFoundError: No module named '_tkinter'`

This happens because your Python installation doesn't include the tkinter C extension.

## Quick Solution: Use CLI Version (No tkinter needed)

```bash
# Run CLI version (recommended - works immediately)
./run_cli.sh

# Or run demos
./run_demo.sh

# Or use the launcher menu and choose option 2
./launch.sh
```

## Long-term Solution: Install tkinter

### Option 1: Use Python from python.org (Easiest)

1. **Download Python 3.10 or 3.11** from https://www.python.org/downloads/
   - The official python.org installer includes tkinter by default
   - Python 3.13 may have compatibility issues with some packages

2. **Install and set up**:
   ```bash
   # After installing from python.org, use it:
   python3.10 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   python blink_detector_gui.py
   ```

### Option 2: Fix Homebrew Python (Advanced)

If Homebrew's python-tk download is failing (network/cache issues):

1. **Clear Homebrew cache completely**:
   ```bash
   rm -rf ~/Library/Caches/Homebrew/*
   brew update
   ```

2. **Try installing python-tk again**:
   ```bash
   brew install python-tk@3.13
   ```

3. **Verify tkinter works**:
   ```bash
   python3 -c "import tkinter; print('tkinter version:', tkinter.TkVersion)"
   ```

### Option 3: Use pyenv with tcl-tk (Most Control)

1. **Install tcl-tk**:
   ```bash
   brew install tcl-tk
   ```

2. **Set environment variables for Python build**:
   ```bash
   export LDFLAGS="-L/opt/homebrew/opt/tcl-tk/lib"
   export CPPFLAGS="-I/opt/homebrew/opt/tcl-tk/include"
   export PKG_CONFIG_PATH="/opt/homebrew/opt/tcl-tk/lib/pkgconfig"
   export PYTHON_CONFIGURE_OPTS="--with-tcltk-includes='-I/opt/homebrew/opt/tcl-tk/include' --with-tcltk-libs='-L/opt/homebrew/opt/tcl-tk/lib -ltcl8.6 -ltk8.6'"
   ```

3. **Install Python with pyenv**:
   ```bash
   # Uninstall and reinstall to rebuild with tcl-tk
   pyenv uninstall 3.10.12
   pyenv install 3.10.12
   pyenv shell 3.10.12
   
   # Create venv and install packages
   cd /Users/tanishka/Downloads/eye_blink
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

4. **Test**:
   ```bash
   python -c "import tkinter; print('tkinter OK')"
   python blink_detector_gui.py
   ```

### Option 4: Use Alternative GUI (Future)

If tkinter continues to be problematic, we could port the GUI to:
- PyQt5 (more features, larger dependency)
- Kivy (cross-platform, mobile-friendly)
- Web-based (Flask + browser interface)

## Current Workaround

Until tkinter is fixed, use these working options:

```bash
# 1. CLI version (fully functional, no GUI)
./run_cli.sh

# 2. Demo mode (interactive, no GUI)
./run_demo.sh

# 3. Use launcher menu
./launch.sh
# Then choose option 2 (CLI) or 3 (Demo)
```

## Verification

To check if tkinter is working:

```bash
python3 -c "import tkinter; tkinter.Tk()"
```

- If a small window appears: ✅ tkinter works
- If error appears: ❌ tkinter not available

## Summary

- **Immediate use**: CLI works perfectly (./run_cli.sh)
- **For GUI**: Install Python from python.org (includes tkinter)
- **Advanced users**: Rebuild Python with tcl-tk support

The CLI version has all the same features as the GUI:
- Blink detection and counting
- Blink rate calculation  
- Drowsiness detection
- Data export to CSV
- Real-time statistics display

Just no graphical interface - everything is shown on the video window.
