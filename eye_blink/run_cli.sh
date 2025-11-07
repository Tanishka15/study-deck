#!/bin/bash

# Quick CLI Launcher - Eye Blink Detection
# Runs the CLI version directly (no GUI/tkinter needed)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VENV_PYTHON="${SCRIPT_DIR}/.venv/bin/python"

if [ -f "$VENV_PYTHON" ]; then
    echo "Starting Eye Blink Detection CLI..."
    echo "Controls: 'q' to quit, 'r' to reset, 's' to save"
    echo ""
    "$VENV_PYTHON" blink_detector.py
else
    echo "Error: Virtual environment not found"
    echo "Run: python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi
