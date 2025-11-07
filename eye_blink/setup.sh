#!/bin/bash

# Eye Blink Detection System - Setup Script
# This script downloads the required facial landmark model

echo "=================================="
echo "Eye Blink Detection System Setup"
echo "=================================="
echo ""

# Check if model already exists
if [ -f "shape_predictor_68_face_landmarks.dat" ]; then
    echo "✓ Facial landmark model already exists"
    exit 0
fi

echo "Downloading facial landmark predictor model..."
echo "This may take a few minutes depending on your connection speed..."
echo ""

# Download the compressed model
if command -v wget &> /dev/null; then
    wget http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2
elif command -v curl &> /dev/null; then
    curl -L -O http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2
else
    echo "Error: Neither wget nor curl is available. Please install one of them."
    exit 1
fi

# Extract the model
echo ""
echo "Extracting model..."
bunzip2 shape_predictor_68_face_landmarks.dat.bz2

# Check if extraction was successful
if [ -f "shape_predictor_68_face_landmarks.dat" ]; then
    echo ""
    echo "✓ Setup complete! Model downloaded and extracted successfully."
    echo ""
    echo "File size: $(ls -lh shape_predictor_68_face_landmarks.dat | awk '{print $5}')"
else
    echo ""
    echo "✗ Error: Model extraction failed"
    exit 1
fi

echo ""
echo "You can now run the application:"
echo "  python blink_detector_gui.py   (GUI version)"
echo "  python blink_detector.py        (CLI version)"
