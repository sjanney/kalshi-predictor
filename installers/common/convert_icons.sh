#!/bin/bash

# Icon Converter Script
# Converts main_logo.png to platform-specific icon formats

set -e

LOGO_PATH="../../assets/main_logo.png"
MAC_OUTPUT="mac/app_icon.icns"
WIN_OUTPUT="windows/app_icon.ico"

echo "========================================="
echo "  Converting Logo to Icon Formats"
echo "========================================="

# Check if logo exists
if [ ! -f "$LOGO_PATH" ]; then
    echo "ERROR: Logo not found at $LOGO_PATH"
    exit 1
fi

# macOS .icns conversion
echo "[1/2] Creating macOS icon (.icns)..."
if command -v sips &> /dev/null && command -v iconutil &> /dev/null; then
    # Create iconset directory
    ICONSET_DIR="mac/AppIcon.iconset"
    mkdir -p "$ICONSET_DIR"
    
    # Generate all required sizes for macOS
    sips -z 16 16     "$LOGO_PATH" --out "$ICONSET_DIR/icon_16x16.png"
    sips -z 32 32     "$LOGO_PATH" --out "$ICONSET_DIR/icon_16x16@2x.png"
    sips -z 32 32     "$LOGO_PATH" --out "$ICONSET_DIR/icon_32x32.png"
    sips -z 64 64     "$LOGO_PATH" --out "$ICONSET_DIR/icon_32x32@2x.png"
    sips -z 128 128   "$LOGO_PATH" --out "$ICONSET_DIR/icon_128x128.png"
    sips -z 256 256   "$LOGO_PATH" --out "$ICONSET_DIR/icon_128x128@2x.png"
    sips -z 256 256   "$LOGO_PATH" --out "$ICONSET_DIR/icon_256x256.png"
    sips -z 512 512   "$LOGO_PATH" --out "$ICONSET_DIR/icon_256x256@2x.png"
    sips -z 512 512   "$LOGO_PATH" --out "$ICONSET_DIR/icon_512x512.png"
    sips -z 1024 1024 "$LOGO_PATH" --out "$ICONSET_DIR/icon_512x512@2x.png"
    
    # Convert to icns
    iconutil -c icns "$ICONSET_DIR" -o "$MAC_OUTPUT"
    rm -rf "$ICONSET_DIR"
    
    echo "✓ macOS icon created: $MAC_OUTPUT"
else
    echo "⚠ Warning: sips/iconutil not found. Skipping macOS icon."
    echo "  (This is normal on non-Mac systems)"
fi

# Windows .ico conversion
echo "[2/2] Creating Windows icon (.ico)..."
if command -v convert &> /dev/null; then
    # ImageMagick is available
    convert "$LOGO_PATH" -define icon:auto-resize=256,128,64,48,32,16 "$WIN_OUTPUT"
    echo "✓ Windows icon created: $WIN_OUTPUT"
elif command -v magick &> /dev/null; then
    # ImageMagick 7+ (Windows naming)
    magick "$LOGO_PATH" -define icon:auto-resize=256,128,64,48,32,16 "$WIN_OUTPUT"
    echo "✓ Windows icon created: $WIN_OUTPUT"
else
    echo "⚠ Warning: ImageMagick not found. Copying PNG as fallback."
    cp "$LOGO_PATH" "$WIN_OUTPUT"
    echo "  Install ImageMagick for proper .ico conversion:"
    echo "  macOS: brew install imagemagick"
    echo "  Linux: sudo apt-get install imagemagick"
    echo "  Windows: Download from https://imagemagick.org"
fi

echo ""
echo "========================================="
echo "  ✓ Icon Conversion Complete!"
echo "========================================="
echo ""
echo "Generated files:"
[ -f "$MAC_OUTPUT" ] && echo "  - $MAC_OUTPUT"
[ -f "$WIN_OUTPUT" ] && echo "  - $WIN_OUTPUT"
echo ""
