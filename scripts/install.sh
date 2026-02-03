#!/bin/bash

# Quick install script for CoolQuick
# This script installs all required dependencies

set -e

REPO_URL="https://github.com/coolquick/coolquick"
INSTALL_DIR="$HOME/.coolquick"
BIN_DIR="$HOME/.local/bin"

print_header() {
    echo "╔════════════════════════════════════════╗"
    echo "║        CoolQuick Installer             ║"
    echo "║   Smart Clipboard Manager              ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
}

detect_platform() {
    OS=$(uname -s)
    ARCH=$(uname -m)
    
    case $OS in
        Linux)
            if [ "$ARCH" = "x86_64" ]; then
                PLATFORM="linux-x64"
                PACKAGE_EXT="deb"
            elif [ "$ARCH" = "aarch64" ]; then
                PLATFORM="linux-arm64"
                PACKAGE_EXT="deb"
            else
                echo "❌ Unsupported architecture: $ARCH"
                exit 1
            fi
            ;;
        Darwin)
            if [ "$ARCH" = "x86_64" ]; then
                PLATFORM="macos-x64"
                PACKAGE_EXT="dmg"
            elif [ "$ARCH" = "arm64" ]; then
                PLATFORM="macos-arm64"
                PACKAGE_EXT="dmg"
            else
                echo "❌ Unsupported architecture: $ARCH"
                exit 1
            fi
            ;;
        MINGW*|CYGWIN*|MSYS*)
            PLATFORM="windows-x64"
            PACKAGE_EXT="msi"
            ;;
        *)
            echo "❌ Unsupported platform: $OS"
            exit 1
            ;;
    esac
}

install_dependencies() {
    echo "📦 Installing dependencies..."
    
    case $PLATFORM in
        linux-*)
            if command -v apt-get &> /dev/null; then
                sudo apt-get update
                sudo apt-get install -y libwebkit2gtk-4.0-dev libgtk-3-dev libayatana-appindicator3-dev
            elif command -v dnf &> /dev/null; then
                sudo dnf install -y webkit2gtk3 gtk3 libappindicator-gtk3
            elif command -v pacman &> /dev/null; then
                sudo pacman -S --needed webkit2gtk gtk3 libappindicator-gtk3
            else
                echo "⚠️  Please install webkit2gtk and gtk3 manually"
            fi
            ;;
        macos-*)
            if ! command -v brew &> /dev/null; then
                echo "🍺 Installing Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            ;;
        windows-*)
            echo "⚠️  Please install dependencies manually:"
            echo "   - WebView2 Runtime"
            echo "   - Visual C++ Redistributable"
            ;;
    esac
}

download_and_install() {
    echo "⬇️  Downloading CoolQuick..."
    
    # Get latest release
    LATEST_RELEASE=$(curl -s "$REPO_URL/releases/latest" | grep -o 'tag_name.*' | head -1 | cut -d'"' -f4)
    
    if [ -z "$LATEST_RELEASE" ]; then
        echo "❌ Failed to fetch latest release"
        exit 1
    fi
    
    DOWNLOAD_URL="$REPO_URL/releases/download/$LATEST_RELEASE/coolquick_${LATEST_RELEASE#v}_${PLATFORM}.${PACKAGE_EXT}"
    TEMP_FILE="/tmp/coolquick.${PACKAGE_EXT}"
    
    echo "   Downloading from: $DOWNLOAD_URL"
    curl -L -o "$TEMP_FILE" "$DOWNLOAD_URL" || {
        echo "❌ Download failed"
        exit 1
    }
    
    echo "🔧 Installing..."
    case $PLATFORM in
        linux-*)
            sudo dpkg -i "$TEMP_FILE" || sudo apt-get install -f -y
            ;;
        macos-*)
            hdiutil attach "$TEMP_FILE"
            cp -R "/Volumes/CoolQuick/CoolQuick.app" /Applications/
            hdiutil detach "/Volumes/CoolQuick"
            ;;
        windows-*)
            echo "⚠️  Please run the installer manually:"
            echo "   $TEMP_FILE"
            ;;
    esac
    
    rm -f "$TEMP_FILE"
}

install_from_source() {
    echo "⚙️  Installing from source..."
    
    # Clone repository
    if [ -d "$INSTALL_DIR" ]; then
        rm -rf "$INSTALL_DIR"
    fi
    
    git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    # Run setup
    ./scripts/setup.sh
    
    # Build
    ./scripts/build.sh --release --bundle
    
    # Install binary
    mkdir -p "$BIN_DIR"
    
    case $PLATFORM in
        linux-*)
            cp "src-tauri/target/release/bundle/deb/*.deb" "$HOME/"
            echo "✅ Package created: $HOME/coolquick_*.deb"
            ;;
        macos-*)
            cp -R "src-tauri/target/release/bundle/macos/CoolQuick.app" /Applications/
            ;;
        windows-*)
            echo "✅ Build complete. Installer in src-tauri/target/release/bundle/"
            ;;
    esac
}

print_success() {
    echo ""
    echo "✅ CoolQuick installed successfully!"
    echo ""
    echo "🚀 Quick Start:"
    echo "   Launch CoolQuick from your applications menu"
    echo ""
    echo "📚 Documentation:"
    echo "   https://github.com/coolquick/coolquick#readme"
    echo ""
}

main() {
    print_header
    detect_platform
    
    # Check if should install from source or binary
    if [ "$1" = "--source" ] || [ "$1" = "-s" ]; then
        install_from_source
    else
        # Try to download binary first
        if curl -s "$REPO_URL/releases/latest" > /dev/null 2>&1; then
            install_dependencies
            download_and_install
        else
            echo "⚠️  Binary download not available, building from source..."
            install_from_source
        fi
    fi
    
    print_success
}

# Help
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "CoolQuick Installer"
    echo ""
    echo "Usage: ./install.sh [options]"
    echo ""
    echo "Options:"
    echo "  --source, -s    Install from source code (requires Rust/Node.js)"
    echo "  --help, -h      Show this help message"
    echo ""
    echo "By default, the script will try to download a pre-built binary."
    echo "If no binary is available, it will fall back to building from source."
    exit 0
fi

main "$@"
