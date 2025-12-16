#!/bin/bash

# Quick Build Script - Builds both installers if possible

echo "========================================="
echo "  Kalshi Predictor - Build All"
echo "========================================="
echo ""

# Check platform
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "✓ Running on macOS"
    CAN_BUILD_MAC=true
    CAN_BUILD_WIN=false
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "✓ Running on Windows"
    CAN_BUILD_MAC=false
    CAN_BUILD_WIN=true
else
    echo "✓ Running on Linux"
    CAN_BUILD_MAC=false
    CAN_BUILD_WIN=false
fi

# Build macOS installer
if [ "$CAN_BUILD_MAC" = true ]; then
    echo ""
    echo "Building macOS installer..."
    cd mac
    ./build_installer.sh
    cd ..
    echo "✓ macOS installer complete"
else
    echo "⊘ Skipping macOS build (not on macOS)"
fi

# Build Windows installer
if [ "$CAN_BUILD_WIN" = true ]; then
    echo ""
    echo "Building Windows installer..."
    cd windows
    powershell -ExecutionPolicy Bypass -File build_installer.ps1
    cd ..
    echo "✓ Windows installer complete"
else
    echo "⊘ Skipping Windows build (not on Windows)"
fi

echo ""
echo "========================================="
echo "  Build Summary"
echo "========================================="

# List outputs
if [ -f "mac/output/KalshiPredictor-"*.pkg ]; then
    echo "✓ macOS: $(ls mac/output/KalshiPredictor-*.pkg)"
fi

if [ -f "windows/output/KalshiPredictorSetup-"*.exe ]; then
    echo "✓ Windows: $(ls windows/output/KalshiPredictorSetup-*.exe)"
fi

echo ""
echo "Next: Test installers on clean machines!"
echo ""
