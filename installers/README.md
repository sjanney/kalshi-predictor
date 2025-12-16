# Kalshi Predictor - Installer Packages

This directory contains installer packages for distributing the Kalshi Predictor application.

## Directory Structure

```
installers/
├── mac/                    # macOS installer files
│   ├── build_installer.sh  # Script to create .pkg installer
│   └── app_bundle/         # macOS app bundle structure
├── windows/                # Windows installer files
│   ├── build_installer.ps1 # PowerShell script to create .exe installer
│   └── setup/              # Windows setup files
└── common/                 # Shared files for both platforms
    ├── app_files.txt       # List of files to include
    └── README.txt          # User-facing README
```

## Building Installers

### macOS (.pkg)
```bash
cd installers/mac
./build_installer.sh
```
This creates `KalshiPredictor-{version}.pkg`

### Windows (.exe)
```powershell
cd installers\windows
.\build_installer.ps1
```
This creates `KalshiPredictorSetup-{version}.exe`

## Distribution Checklist

Before building installers:
- [ ] Update version number in build scripts
- [ ] Test on clean machine
- [ ] Ensure `public_key.pem` is included
- [ ] Update CHANGELOG
- [ ] Generate release notes

## Requirements

### macOS
- macOS 10.15 or later
- Python 3.8+
- Node.js 16+

### Windows
- Windows 10 or later
- Python 3.8+
- Node.js 16+

## License Key Generation

After installation, users will need a license key. Generate keys using:
```bash
python3 license_gen_tui.py
```

## Support

For issues, contact: support@kalshipredictor.com
