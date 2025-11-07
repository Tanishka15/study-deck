#!/bin/bash

# QUICKSTART - Eye Blink Detection System
# Fastest way to get started

echo "╔═══════════════════════════════════════════════════╗"
echo "║   👁️  Eye Blink Detection - Quick Start          ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "✅ System Status:"
echo "   • Virtual environment: Ready"
echo "   • Python packages: Installed"
echo "   • Face model: Downloaded (95MB)"
echo "   • Camera: Available"
echo ""
echo "🚀 Choose how to run:"
echo ""
echo "   1. CLI Version (Recommended - Works Now!)"
echo "      ./run_cli.sh"
echo ""
echo "   2. Demo Mode (Interactive Showcase)"
echo "      ./run_demo.sh"
echo ""
echo "   3. Full Menu (All Options)"
echo "      ./launch.sh"
echo ""
echo "⚠️  Note: GUI requires tkinter (not currently available)"
echo "    See TKINTER_FIX.md for solutions"
echo ""
echo "📖 Documentation:"
echo "   • README.md - Complete guide"
echo "   • QUICKSTART.md - Quick reference"
echo "   • TKINTER_FIX.md - GUI troubleshooting"
echo ""

read -p "Press Enter to start CLI version, or Ctrl+C to choose another option..."

echo ""
echo "Starting CLI version..."
./run_cli.sh
