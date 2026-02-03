#!/bin/bash

# Build script for CoolQuick
# Supports macOS, Linux, and cross-compilation

set -e

VERSION=$(grep '^version' src-tauri/Cargo.toml | head -1 | cut -d'"' -f2)
APP_NAME="CoolQuick"
BUILD_DIR="src-tauri/target/release"

show_help() {
    echo "$APP_NAME Build Script v$VERSION"
    echo ""
    echo "Usage: ./scripts/build.sh [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help       Show this help message"
    echo "  -t, --target     Target platform (default: current)"
    echo "  -b, --bundle     Create distribution packages"
    echo "  --release        Build release version (optimized)"
    echo "  --debug          Build debug version (default)"
    echo "  --sign           Sign the application (requires certificates)"
    echo ""
    echo "Supported targets:"
    echo "  x86_64-apple-darwin     (Intel Mac)"
    echo "  aarch64-apple-darwin    (Apple Silicon Mac)"
    echo "  x86_64-unknown-linux-gnu  (Linux x64)"
    echo "  x86_64-pc-windows-msvc  (Windows x64)"
    echo ""
}

TARGET=""
BUNDLE=false
RELEASE=false
SIGN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -t|--target)
            TARGET="$2"
            shift 2
            ;;
        -b|--bundle)
            BUNDLE=true
            shift
            ;;
        --release)
            RELEASE=true
            shift
            ;;
        --debug)
            RELEASE=false
            shift
            ;;
        --sign)
            SIGN=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Detect current platform if no target specified
if [ -z "$TARGET" ]; then
    case $(uname -s) in
        Darwin)
            if [ "$(uname -m)" = "arm64" ]; then
                TARGET="aarch64-apple-darwin"
            else
                TARGET="x86_64-apple-darwin"
            fi
            ;;
        Linux)
            TARGET="x86_64-unknown-linux-gnu"
            ;;
        MINGW*|CYGWIN*|MSYS*)
            TARGET="x86_64-pc-windows-msvc"
            ;;
        *)
            echo "❌ Unknown platform: $(uname -s)"
            exit 1
            ;;
    esac
fi

echo "🔨 Building $APP_NAME v$VERSION"
echo "   Target: $TARGET"
echo "   Profile: $([ "$RELEASE" = true ] && echo "release" || echo "debug")"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v cargo &> /dev/null; then
    echo "❌ Rust/Cargo is not installed"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

echo "✅ Prerequisites met"

# Install target if needed
if ! rustup target list --installed | grep -q "$TARGET"; then
    echo "📦 Installing target: $TARGET"
    rustup target add "$TARGET"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci
cd src-tauri && cargo fetch && cd ..

# Build frontend
echo "🌐 Building frontend..."
npm run build

# Build Tauri
echo "⚙️ Building Tauri application..."
BUILD_ARGS=""
[ "$RELEASE" = true ] && BUILD_ARGS="--release"

cd src-tauri
if [ -n "$TARGET" ]; then
    cargo build $BUILD_ARGS --target "$TARGET"
else
    cargo build $BUILD_ARGS
fi
cd ..

# Sign application (if requested)
if [ "$SIGN" = true ]; then
    echo "🔏 Signing application..."
    
    case $TARGET in
        *apple*)
            if [ -z "$APPLE_CERTIFICATE" ] || [ -z "$APPLE_CERTIFICATE_PASSWORD" ]; then
                echo "⚠️  Apple signing certificates not set"
                echo "Set APPLE_CERTIFICATE and APPLE_CERTIFICATE_PASSWORD"
            else
                # macOS code signing
                APP_PATH="$BUILD_DIR/$TARGET/release/bundle/macos/$APP_NAME.app"
                if [ -d "$APP_PATH" ]; then
                    codesign --force --deep --sign "Developer ID Application" "$APP_PATH"
                    echo "✅ Signed macOS app"
                fi
            fi
            ;;
        *windows*)
            echo "⚠️ Windows signing requires signtool.exe"
            ;;
    esac
fi

# Create bundle
if [ "$BUNDLE" = true ]; then
    echo "📦 Creating distribution packages..."
    cd src-tauri
    
    if [ -n "$TARGET" ]; then
        cargo tauri build $BUILD_ARGS --target "$TARGET"
    else
        cargo tauri build $BUILD_ARGS
    fi
    
    cd ..
    
    # Show output
    echo ""
    echo "📁 Build artifacts:"
    find "$BUILD_DIR" -name "*$APP_NAME*" -type f -exec ls -lh {} \; 2>/dev/null || true
    
    # Generate checksums
    echo ""
    echo "🔐 Generating checksums..."
    BUNDLE_DIR="$BUILD_DIR/bundle"
    if [ -d "$BUNDLE_DIR" ]; then
        cd "$BUNDLE_DIR"
        sha256sum * > checksums.txt 2>/dev/null || shasum -a 256 * > checksums.txt
        cd - > /dev/null
        echo "✅ Checksums written to $BUNDLE_DIR/checksums.txt"
    fi
fi

echo ""
echo "✅ Build complete!"
echo "   Version: $VERSION"
echo "   Target: $TARGET"

if [ "$BUNDLE" = true ]; then
    echo "   Artifacts: $BUILD_DIR/bundle/"
fi
