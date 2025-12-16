#!/bin/bash

# Kalshi Predictor - macOS Installer Builder
# Creates a .pkg installer for macOS distribution

set -e

VERSION="1.0.0"
APP_NAME="KalshiPredictor"
IDENTIFIER="com.kalshipredictor.app"
BUILD_DIR="$(pwd)/build"
PAYLOAD_DIR="$BUILD_DIR/payload"
SCRIPTS_DIR="$BUILD_DIR/scripts"
OUTPUT_DIR="$(pwd)/output"

echo "========================================="
echo "  Building macOS Installer v$VERSION"
echo "========================================="

# Clean previous builds
echo "[1/6] Cleaning previous builds..."
rm -rf "$BUILD_DIR" "$OUTPUT_DIR"
mkdir -p "$PAYLOAD_DIR" "$SCRIPTS_DIR" "$OUTPUT_DIR"

# Copy application files
echo "[2/6] Copying application files..."
INSTALL_PATH="$PAYLOAD_DIR/Applications/$APP_NAME"
mkdir -p "$INSTALL_PATH"

# Copy project files (excluding unnecessary items)
rsync -av --exclude='venv' \
          --exclude='node_modules' \
          --exclude='.git' \
          --exclude='__pycache__' \
          --exclude='*.pyc' \
          --exclude='.DS_Store' \
          --exclude='data/historical_data.db' \
          --exclude='logs' \
          ../../backend "$INSTALL_PATH/"
          
rsync -av --exclude='node_modules' \
          --exclude='dist' \
          --exclude='build' \
          ../../frontend "$INSTALL_PATH/"

# Copy essential files
cp ../../install.sh "$INSTALL_PATH/"
cp ../../backend/public_key.pem "$INSTALL_PATH/"
cp ../../README.md "$INSTALL_PATH/" 2>/dev/null || echo "No README found"

# Create postinstall script
echo "[3/6] Creating installation scripts..."
cat > "$SCRIPTS_DIR/postinstall" << 'POSTINSTALL'
#!/bin/bash

INSTALL_DIR="/Applications/KalshiPredictor"
cd "$INSTALL_DIR"

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    osascript -e 'display dialog "Python 3 is required but not installed. Please install Python 3.8 or later from python.org" buttons {"OK"} default button "OK" with icon stop'
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    osascript -e 'display dialog "Node.js is required but not installed. Please install Node.js 16 or later from nodejs.org" buttons {"OK"} default button "OK" with icon stop'
    exit 1
fi

# Run installation
chmod +x install.sh
./install.sh

# Create launcher in Applications
cat > "/Applications/Kalshi Predictor.command" << 'LAUNCHER'
#!/bin/bash
cd "/Applications/KalshiPredictor"
./run_app.sh
LAUNCHER

chmod +x "/Applications/Kalshi Predictor.command"

# Show success message
osascript -e 'display dialog "Kalshi Predictor has been installed successfully!\n\nClick the \"Kalshi Predictor\" app in your Applications folder to launch." buttons {"OK"} default button "OK" with icon note'

exit 0
POSTINSTALL

chmod +x "$SCRIPTS_DIR/postinstall"

# Build the package
echo "[4/6] Building package..."
pkgbuild --root "$PAYLOAD_DIR" \
         --scripts "$SCRIPTS_DIR" \
         --identifier "$IDENTIFIER" \
         --version "$VERSION" \
         --install-location "/" \
         "$BUILD_DIR/$APP_NAME-$VERSION.pkg"

# Create distribution package (optional, for better UI)
echo "[5/6] Creating distribution package..."
cat > "$BUILD_DIR/distribution.xml" << DISTRIBUTION
<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="1">
    <title>Kalshi Predictor</title>
    <organization>$IDENTIFIER</organization>
    <domains enable_localSystem="true"/>
    <options customize="never" require-scripts="true" rootVolumeOnly="true" />
    <welcome file="welcome.html" mime-type="text/html" />
    <license file="license.txt" mime-type="text/plain" />
    <conclusion file="conclusion.html" mime-type="text/html" />
    <pkg-ref id="$IDENTIFIER"/>
    <options customize="never" require-scripts="false"/>
    <choices-outline>
        <line choice="default">
            <line choice="$IDENTIFIER"/>
        </line>
    </choices-outline>
    <choice id="default"/>
    <choice id="$IDENTIFIER" visible="false">
        <pkg-ref id="$IDENTIFIER"/>
    </choice>
    <pkg-ref id="$IDENTIFIER" version="$VERSION" onConclusion="none">$APP_NAME-$VERSION.pkg</pkg-ref>
</installer-gui-script>
DISTRIBUTION

# Create welcome message
cat > "$BUILD_DIR/welcome.html" << 'WELCOME'
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Welcome</title></head>
<body>
<h1>Welcome to Kalshi Predictor</h1>
<p>This installer will install Kalshi Predictor on your Mac.</p>
<p><strong>Requirements:</strong></p>
<ul>
    <li>macOS 10.15 or later</li>
    <li>Python 3.8 or later</li>
    <li>Node.js 16 or later</li>
</ul>
<p>After installation, you will need a valid license key to use the application.</p>
</body>
</html>
WELCOME

# Create license file
cat > "$BUILD_DIR/license.txt" << 'LICENSE'
KALSHI PREDICTOR LICENSE AGREEMENT

This software is licensed, not sold. By installing this software, you agree to the following terms:

1. This software requires a valid license key to operate.
2. Each license key is valid for one installation only.
3. You may not redistribute, modify, or reverse engineer this software.
4. The software is provided "as is" without warranty of any kind.

For full terms and conditions, visit: https://kalshipredictor.com/terms
LICENSE

# Create conclusion message
cat > "$BUILD_DIR/conclusion.html" << 'CONCLUSION'
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Installation Complete</title></head>
<body>
<h1>Installation Complete!</h1>
<p>Kalshi Predictor has been installed successfully.</p>
<p><strong>Next Steps:</strong></p>
<ol>
    <li>Launch "Kalshi Predictor" from your Applications folder</li>
    <li>Enter your license key when prompted</li>
    <li>Start predicting!</li>
</ol>
<p>Need help? Visit our documentation at <a href="https://docs.kalshipredictor.com">docs.kalshipredictor.com</a></p>
</body>
</html>
CONCLUSION

productbuild --distribution "$BUILD_DIR/distribution.xml" \
             --package-path "$BUILD_DIR" \
             --resources "$BUILD_DIR" \
             "$OUTPUT_DIR/$APP_NAME-$VERSION.pkg"

echo "[6/6] Finalizing..."
echo ""
echo "========================================="
echo "  ✓ Build Complete!"
echo "========================================="
echo "Installer created: $OUTPUT_DIR/$APP_NAME-$VERSION.pkg"
echo ""
echo "To distribute:"
echo "1. Test the installer on a clean Mac"
echo "2. (Optional) Code sign with: productsign --sign 'Developer ID' input.pkg output.pkg"
echo "3. (Optional) Notarize with Apple for Gatekeeper"
echo ""
