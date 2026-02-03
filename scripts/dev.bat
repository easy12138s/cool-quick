@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: CoolQuick Development Helper for Windows
:: Usage: scripts\dev.bat [command]

set COMMAND=%1
if "%~1"=="" set COMMAND=dev

goto :%COMMAND% 2>nul || goto :help

:help
echo CoolQuick Development Helper
echo.
echo Usage: scripts\dev.bat [command]
echo.
echo Commands:
echo   dev         - Start development server with hot reload
echo   build       - Build production version
echo   clean       - Clean build artifacts
echo   lint        - Run linter and formatter
echo   setup       - Install all dependencies
echo   test        - Run tests
echo   icon        - Generate app icons from SVG
echo   help        - Show this help message
echo.
goto :eof

:dev
echo 🚀 Starting development server...
call :check_prerequisites
npm run tauri-dev
goto :eof

:build
echo 🔨 Building production version...
call :check_prerequisites

echo Building frontend...
npm run build

echo Building Tauri app...
cd src-tauri
cargo build --release
cd ..

echo ✅ Build complete!
echo 📦 Artifacts are in src-tauri\target\release\bundle\
goto :eof

:clean
echo 🧹 Cleaning build artifacts...
if exist dist rmdir /s /q dist
if exist src-tauri\target rmdir /s /q src-tauri\target
if exist node_modules rmdir /s /q node_modules
echo ✅ Clean complete
goto :eof

:lint
echo 🔍 Running linter...
npm run lint
npm run format-check
echo ✅ Lint complete
goto :eof

:setup
echo 📦 Installing dependencies...
call :check_prerequisites
npm install
cd src-tauri
cargo fetch
cd ..
echo ✅ Setup complete
goto :eof

:test
echo 🧪 Running tests...
cd src-tauri
cargo test
cd ..
goto :eof

:icon
echo 🎨 Generating app icons...
echo Note: ImageMagick is required
echo Install from: https://imagemagick.org/script/download.php#windows

set ICON_DIR=src-tauri\icons
set SVG_FILE=%ICON_DIR%\icon.svg

if not exist "%SVG_FILE%" (
    echo ❌ Icon SVG not found at %SVG_FILE%
    goto :eof
)

:: Check if ImageMagick is available
where convert >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ImageMagick not found in PATH
    echo Please install ImageMagick and add it to PATH
    goto :eof
)

:: Generate PNG icons
convert -background none -density 300 "%SVG_FILE%" -resize 32x32 "%ICON_DIR%\32x32.png"
convert -background none -density 300 "%SVG_FILE%" -resize 128x128 "%ICON_DIR%\128x128.png"
convert -background none -density 300 "%SVG_FILE%" -resize 256x256 "%ICON_DIR%\128x128@2x.png"
convert -background none -density 300 "%SVG_FILE%" -resize 512x512 "%ICON_DIR%\icon.png"

:: Generate ICO for Windows
convert -background none -density 300 "%SVG_FILE%" -define icon:auto-resize=256,128,64,48,32,16 "%ICON_DIR%\icon.ico"

echo ✅ Icons generated
goto :eof

:check_prerequisites
echo 🔍 Checking prerequisites...

node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed
    echo Please install from: https://nodejs.org
    exit /b 1
)

cargo --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Rust is not installed
    echo Please install from: https://rustup.rs
    exit /b 1
)

for /f "tokens=1 delims=." %%a in ('node -v') do (
    set NODE_VERSION=%%a
    set NODE_VERSION=!NODE_VERSION:~1!
)

if !NODE_VERSION! LSS 18 (
    echo ❌ Node.js version must be ^>= 18
    exit /b 1
)

echo ✅ All prerequisites met
goto :eof
