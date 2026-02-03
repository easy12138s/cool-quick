#!/bin/bash

# CoolQuick Development Helper Script
# Usage: ./scripts/dev.sh [command]

set -e

COMMAND=${1:-dev}

show_help() {
    echo "CoolQuick Development Helper"
    echo ""
    echo "Usage: ./scripts/dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  dev         - Start development server with hot reload"
    echo "  build       - Build production version"
    echo "  clean       - Clean build artifacts"
    echo "  lint        - Run linter and formatter"
    echo "  test        - Run tests (if available)"
    echo "  setup       - Install all dependencies"
    echo "  icon        - Generate app icons from SVG"
    echo "  help        - Show this help message"
    echo ""
}

check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed"
        exit 1
    fi
    
    if ! command -v cargo &> /dev/null; then
        echo "❌ Rust is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo "❌ Node.js version must be >= 18 (current: $(node -v))"
        exit 1
    fi
    
    echo "✅ All prerequisites met"
}

cmd_dev() {
    echo "🚀 Starting development server..."
    check_prerequisites
    npm run tauri-dev
}

cmd_build() {
    echo "🔨 Building production version..."
    check_prerequisites
    
    echo "Building frontend..."
    npm run build
    
    echo "Building Tauri app..."
    cargo tauri build
    
    echo "✅ Build complete!"
    echo "📦 Artifacts are in src-tauri/target/release/bundle/"
}

cmd_clean() {
    echo "🧹 Cleaning build artifacts..."
    rm -rf dist
    rm -rf src-tauri/target
    rm -rf node_modules
    echo "✅ Clean complete"
}

cmd_lint() {
    echo "🔍 Running linter..."
    npm run lint
    npm run format-check
    echo "✅ Lint complete"
}

cmd_setup() {
    echo "📦 Installing dependencies..."
    check_prerequisites
    npm install
    cd src-tauri && cargo fetch
    echo "✅ Setup complete"
}

cmd_icon() {
    echo "🎨 Generating app icons..."
    if ! command -v convert &> /dev/null; then
        echo "❌ ImageMagick is required (convert command not found)"
        echo "Install: sudo apt-get install imagemagick (Linux) or brew install imagemagick (macOS)"
        exit 1
    fi
    
    ICON_DIR="src-tauri/icons"
    SVG_FILE="$ICON_DIR/icon.svg"
    
    if [ ! -f "$SVG_FILE" ]; then
        echo "❌ Icon SVG not found at $SVG_FILE"
        exit 1
    fi
    
    # Generate PNG icons
    convert -background none -density 300 "$SVG_FILE" -resize 32x32 "$ICON_DIR/32x32.png"
    convert -background none -density 300 "$SVG_FILE" -resize 128x128 "$ICON_DIR/128x128.png"
    convert -background none -density 300 "$SVG_FILE" -resize 256x256 "$ICON_DIR/128x128@2x.png"
    convert -background none -density 300 "$SVG_FILE" -resize 512x512 "$ICON_DIR/icon.png"
    
    # Generate ICO for Windows
    convert -background none -density 300 "$SVG_FILE" -define icon:auto-resize=256,128,64,48,32,16 "$ICON_DIR/icon.ico"
    
    # Generate ICNS for macOS
    if command -v png2icns &> /dev/null; then
        png2icns "$ICON_DIR/icon.icns" "$ICON_DIR/icon.png"
    else
        echo "⚠️  png2icns not found, skipping .icns generation"
    fi
    
    echo "✅ Icons generated"
}

cmd_test() {
    echo "🧪 Running tests..."
    cd src-tauri && cargo test
}

# Main
case $COMMAND in
    dev)
        cmd_dev
        ;;
    build)
        cmd_build
        ;;
    clean)
        cmd_clean
        ;;
    lint)
        cmd_lint
        ;;
    setup)
        cmd_setup
        ;;
    icon)
        cmd_icon
        ;;
    test)
        cmd_test
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac
