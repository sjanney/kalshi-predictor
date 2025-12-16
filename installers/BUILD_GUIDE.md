# Building Distribution Packages

This guide explains how to build installer packages for macOS and Windows.

## Prerequisites

### macOS Build Requirements
- macOS 10.15 or later
- Xcode Command Line Tools (`xcode-select --install`)
- ImageMagick (optional, for icon conversion): `brew install imagemagick`

### Windows Build Requirements
- Windows 10 or later
- [Inno Setup 6](https://jrsoftware.org/isdl.php)
- ImageMagick (optional, for icon conversion)
- PowerShell 5.1 or later

## Pre-Build Steps

### 1. Update Version Number
Edit the version in both build scripts:
- `installers/mac/build_installer.sh` - Line 7: `VERSION="1.0.0"`
- `installers/windows/build_installer.ps1` - Line 5: `[string]$Version = "1.0.0"`

### 2. Convert Icons (One-time setup)
```bash
cd installers/common
chmod +x convert_icons.sh
./convert_icons.sh
```

This creates:
- `installers/mac/app_icon.icns` - macOS icon
- `installers/windows/app_icon.png` - Windows icon (or .ico if ImageMagick is installed)

### 3. Test the Application
Before building installers, ensure the app works:
```bash
cd ../..
./install.sh
./run_app.sh
```

## Building macOS Installer

```bash
cd installers/mac
chmod +x build_installer.sh
./build_installer.sh
```

**Output**: `installers/mac/output/KalshiPredictor-{version}.pkg`

### Optional: Code Signing (for distribution outside App Store)
```bash
# Sign the package
productsign --sign "Developer ID Installer: Your Name" \
  output/KalshiPredictor-1.0.0.pkg \
  output/KalshiPredictor-1.0.0-signed.pkg

# Notarize with Apple (requires Apple Developer account)
xcrun notarytool submit output/KalshiPredictor-1.0.0-signed.pkg \
  --apple-id "your@email.com" \
  --team-id "TEAMID" \
  --password "app-specific-password" \
  --wait

# Staple the notarization ticket
xcrun stapler staple output/KalshiPredictor-1.0.0-signed.pkg
```

## Building Windows Installer

### On Windows:
```powershell
cd installers\windows
.\build_installer.ps1
```

### On macOS/Linux (cross-compile):
You'll need to use a Windows VM or Wine with Inno Setup.

**Output**: `installers/windows/output/KalshiPredictorSetup-{version}.exe`

### Optional: Code Signing (for Windows SmartScreen)
```powershell
# Sign the installer (requires code signing certificate)
signtool sign /f "certificate.pfx" /p "password" /t http://timestamp.digicert.com `
  output\KalshiPredictorSetup-1.0.0.exe
```

## Testing Installers

### macOS Testing
1. Copy the .pkg to a clean Mac (or VM)
2. Double-click to install
3. Verify installation in `/Applications/KalshiPredictor/`
4. Launch "Kalshi Predictor.command" from Applications
5. Test license activation

### Windows Testing
1. Copy the .exe to a clean Windows machine (or VM)
2. Run the installer
3. Verify installation in `C:\Program Files\KalshiPredictor\`
4. Run `run_app.bat` from Start Menu or Desktop
5. Test license activation

## Distribution Checklist

Before releasing:
- [ ] Version numbers updated in all files
- [ ] Icons converted and included
- [ ] Application tested on clean machine
- [ ] License key generation tested
- [ ] README and documentation updated
- [ ] CHANGELOG updated
- [ ] Installers tested on target platforms
- [ ] (Optional) Code signed
- [ ] (Optional) Notarized (macOS)
- [ ] Release notes prepared

## File Sizes

Typical installer sizes:
- macOS .pkg: ~50-100 MB
- Windows .exe: ~50-100 MB

(Size depends on dependencies and compression)

## Troubleshooting

### macOS: "App is damaged and can't be opened"
- The app needs to be code signed and notarized
- Or users need to right-click → Open (first time only)

### Windows: "Windows protected your PC"
- The app needs to be code signed
- Or users need to click "More info" → "Run anyway"

### Build fails with "command not found"
- Ensure all prerequisites are installed
- Check PATH environment variables

### Icons not showing
- Verify icon files exist in correct locations
- Re-run `convert_icons.sh`
- Check icon file formats (.icns for Mac, .ico for Windows)

## Support

For build issues:
- Check the logs in `installers/mac/build/` or `installers/windows/build/`
- Ensure all prerequisites are installed
- Try building on a clean system

---

Last updated: 2024-11-26
