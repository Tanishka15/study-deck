#!/bin/bash

# Eye Blink Detection System - Launcher
# Quick launcher with menu

# Detect virtual environment python
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VENV_PYTHON="${SCRIPT_DIR}/.venv/bin/python"

# Use venv python if available, otherwise system python3
if [ -f "$VENV_PYTHON" ]; then
    PYTHON_CMD="$VENV_PYTHON"
else
    PYTHON_CMD="python3"
fi

clear
echo "╔═══════════════════════════════════════════════════╗"
echo "║   👁️  Eye Blink Detection System                 ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "Using Python: $PYTHON_CMD"
echo ""
echo "Select an option:"
echo ""
echo "  1) Launch GUI Application (Requires tkinter)"
echo "  2) Launch CLI Application (Recommended)"
echo "  3) Run Demo"
echo "  4) Test Installation"
echo "  5) Download Face Model"
echo "  6) View Documentation"
echo "  7) Exit"
echo ""
read -p "Enter your choice (1-7): " choice

case $choice in
    1)
        echo ""
        echo "Starting GUI application..."
        "$PYTHON_CMD" blink_detector_gui.py
        ;;
    2)
        echo ""
        echo "Starting CLI application..."
        "$PYTHON_CMD" blink_detector.py
        ;;
    3)
        echo ""
        echo "Starting demo..."
        "$PYTHON_CMD" demo.py
        ;;
    4)
        echo ""
        echo "Testing installation..."
        "$PYTHON_CMD" test_installation.py
        ;;
    5)
        echo ""
        echo "Downloading face model..."
        ./setup.sh
        ;;
    6)
        echo ""
        echo "Available documentation:"
        echo "  - README.md (complete guide)"
        echo "  - QUICKSTART.md (quick start)"
        echo "  - INSTALL.md (installation)"
        echo "  - PROJECT_SUMMARY.md (overview)"
        echo ""
        read -p "Open README.md? (y/n): " open_doc
        if [ "$open_doc" = "y" ] || [ "$open_doc" = "Y" ]; then
            if command -v open &> /dev/null; then
                open README.md
            elif command -v xdg-open &> /dev/null; then
                xdg-open README.md
            else
                cat README.md
            fi
        fi
        ;;
    7)
        echo ""
        echo "Goodbye!"
        exit 0
        ;;
    *)
        echo ""
        echo "Invalid choice. Please run the script again."
        exit 1
        ;;
esac
