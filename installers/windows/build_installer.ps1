# Kalshi Predictor - Windows Installer Builder
# Creates a .exe installer for Windows distribution using Inno Setup

param(
    [string]$Version = "1.0.0"
)

$AppName = "KalshiPredictor"
$BuildDir = Join-Path $PSScriptRoot "build"
$OutputDir = Join-Path $PSScriptRoot "output"
$SetupScript = Join-Path $BuildDir "setup.iss"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Building Windows Installer v$Version" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check for Inno Setup
$InnoSetupPath = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if (-not (Test-Path $InnoSetupPath)) {
    Write-Host "ERROR: Inno Setup not found!" -ForegroundColor Red
    Write-Host "Please install Inno Setup from: https://jrsoftware.org/isdl.php" -ForegroundColor Yellow
    exit 1
}

# Clean previous builds
Write-Host "[1/5] Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path $BuildDir) { Remove-Item -Recurse -Force $BuildDir }
if (Test-Path $OutputDir) { Remove-Item -Recurse -Force $OutputDir }
New-Item -ItemType Directory -Path $BuildDir, $OutputDir | Out-Null

# Copy application files
Write-Host "[2/5] Copying application files..." -ForegroundColor Yellow
$AppFilesDir = Join-Path $BuildDir "app"
New-Item -ItemType Directory -Path $AppFilesDir | Out-Null

# Copy backend
robocopy "..\..\backend" "$AppFilesDir\backend" /E /XD venv __pycache__ /XF *.pyc | Out-Null

# Copy frontend
robocopy "..\..\frontend" "$AppFilesDir\frontend" /E /XD node_modules dist build | Out-Null

# Copy essential files
Copy-Item "..\..\install.sh" $AppFilesDir -ErrorAction SilentlyContinue
Copy-Item "..\..\public_key.pem" $AppFilesDir
Copy-Item "..\..\README.md" $AppFilesDir -ErrorAction SilentlyContinue

# Create Windows install script
Write-Host "[3/5] Creating installation scripts..." -ForegroundColor Yellow
$InstallScript = @"
@echo off
echo ========================================
echo   Kalshi Predictor - Installation
echo ========================================
echo.

REM Check for Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python 3 is not installed or not in PATH
    echo Please install Python 3.8+ from python.org
    pause
    exit /b 1
)

REM Check for npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 16+ from nodejs.org
    pause
    exit /b 1
)

echo [1/4] Creating virtual environment...
python -m venv venv
call venv\Scripts\activate.bat

echo [2/4] Installing Python dependencies...
pip install -r backend\requirements.txt

echo [3/4] Installing Node dependencies...
cd frontend
npm install

echo [4/4] Building frontend...
npm run build
cd ..

echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo To start the application, run: run_app.bat
pause
"@

Set-Content -Path (Join-Path $AppFilesDir "install.bat") -Value $InstallScript

# Create launcher script
$LauncherScript = @"
@echo off
title Kalshi Predictor

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Start backend
echo Starting Backend...
start /B uvicorn backend.app.main:app --reload --port 8000

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo Starting Frontend...
cd frontend
start /B npm run dev

echo.
echo ========================================
echo   Kalshi Predictor is running!
echo ========================================
echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Press Ctrl+C to stop the application
echo.

REM Keep window open
pause
"@

Set-Content -Path (Join-Path $AppFilesDir "run_app.bat") -Value $LauncherScript

# Create Inno Setup script
Write-Host "[4/5] Creating Inno Setup script..." -ForegroundColor Yellow
$InnoScript = @"
; Kalshi Predictor - Inno Setup Script

#define MyAppName "Kalshi Predictor"
#define MyAppVersion "$Version"
#define MyAppPublisher "Kalshi Predictor"
#define MyAppURL "https://kalshipredictor.com"
#define MyAppExeName "run_app.bat"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=license.txt
OutputDir=$OutputDir
OutputBaseFilename=KalshiPredictorSetup-{#MyAppVersion}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64
SetupIconFile=app_icon.png
UninstallDisplayIcon={app}\app_icon.png

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "$AppFilesDir\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Install Dependencies"; Filename: "{app}\install.bat"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\install.bat"; Description: "Install dependencies"; Flags: postinstall shellexec skipifsilent
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: postinstall shellexec skipifsilent nowait

[Code]
function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  Result := True;
  
  // Check for Python
  if not Exec('python', '--version', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    MsgBox('Python 3 is required but not found in PATH.' + #13#10 + 
           'Please install Python 3.8 or later from python.org', mbError, MB_OK);
    Result := False;
  end;
  
  // Check for Node.js
  if Result and not Exec('npm', '--version', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    MsgBox('Node.js is required but not found in PATH.' + #13#10 + 
           'Please install Node.js 16 or later from nodejs.org', mbError, MB_OK);
    Result := False;
  end;
end;
"@

Set-Content -Path $SetupScript -Value $InnoScript

# Create license file
$LicenseText = @"
KALSHI PREDICTOR LICENSE AGREEMENT

This software is licensed, not sold. By installing this software, you agree to the following terms:

1. This software requires a valid license key to operate.
2. Each license key is valid for one installation only.
3. You may not redistribute, modify, or reverse engineer this software.
4. The software is provided "as is" without warranty of any kind.

For full terms and conditions, visit: https://kalshipredictor.com/terms
"@

Set-Content -Path (Join-Path $BuildDir "license.txt") -Value $LicenseText

# Build installer
Write-Host "[5/5] Building installer with Inno Setup..." -ForegroundColor Yellow
& $InnoSetupPath $SetupScript

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  ✓ Build Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Installer created: $OutputDir\KalshiPredictorSetup-$Version.exe" -ForegroundColor Cyan
Write-Host ""
Write-Host "To distribute:" -ForegroundColor Yellow
Write-Host "1. Test the installer on a clean Windows machine"
Write-Host "2. (Optional) Code sign with signtool.exe"
Write-Host ""
