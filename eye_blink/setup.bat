@echo off
REM Eye Blink Detection System - Setup Script for Windows
REM This script downloads the required facial landmark model

echo ==================================
echo Eye Blink Detection System Setup
echo ==================================
echo.

REM Check if model already exists
if exist "shape_predictor_68_face_landmarks.dat" (
    echo [OK] Facial landmark model already exists
    goto :end
)

echo Downloading facial landmark predictor model...
echo This may take a few minutes depending on your connection speed...
echo.

REM Download using PowerShell
powershell -Command "& {Invoke-WebRequest -Uri 'http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2' -OutFile 'shape_predictor_68_face_landmarks.dat.bz2'}"

echo.
echo Extracting model...

REM Extract using PowerShell (requires .NET Framework)
powershell -Command "& {Add-Type -AssemblyName System.IO.Compression.FileSystem; $source = 'shape_predictor_68_face_landmarks.dat.bz2'; $destination = 'shape_predictor_68_face_landmarks.dat'; if (Test-Path $source) { try { $fs = [System.IO.File]::OpenRead($source); $bz = New-Object System.IO.Compression.BZip2Stream($fs, [System.IO.Compression.CompressionMode]::Decompress); $output = [System.IO.File]::Create($destination); $bz.CopyTo($output); $output.Close(); $bz.Close(); $fs.Close(); Write-Host 'Extraction complete'; } catch { Write-Host 'Error: Please extract manually using 7-Zip or WinRAR'; } }}"

REM Check if extraction was successful
if exist "shape_predictor_68_face_landmarks.dat" (
    echo.
    echo [OK] Setup complete! Model downloaded and extracted successfully.
    echo.
    echo You can now run the application:
    echo   python blink_detector_gui.py   (GUI version)
    echo   python blink_detector.py        (CLI version)
) else (
    echo.
    echo [ERROR] Model extraction failed
    echo Please manually extract shape_predictor_68_face_landmarks.dat.bz2
    echo using 7-Zip, WinRAR, or similar tool
)

:end
echo.
pause
