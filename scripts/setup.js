#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const platform = process.platform;
const arch = process.arch;

console.log('🚀 CoolQuick Setup');
console.log(`Platform: ${platform} (${arch})\n`);

function checkCommand(command, name) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    console.log(`✅ ${name} is installed`);
    return true;
  } catch {
    console.log(`❌ ${name} is not installed`);
    return false;
  }
}

function installInstructions() {
  console.log('\n📦 Installation Instructions:\n');
  
  switch (platform) {
    case 'win32':
      console.log('Windows:');
      console.log('  1. Install Node.js: https://nodejs.org (LTS version)');
      console.log('  2. Install Rust: https://rustup.rs');
      console.log('  3. Install Tauri dependencies:');
      console.log('     winget install Microsoft.WebView2Runtime');
      break;
      
    case 'darwin':
      console.log('macOS:');
      console.log('  1. Install Homebrew: https://brew.sh');
      console.log('  2. Install Node.js: brew install node');
      console.log('  3. Install Rust: curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh');
      console.log('  4. Install Xcode Command Line Tools: xcode-select --install');
      break;
      
    case 'linux':
      console.log('Linux (Ubuntu/Debian):');
      console.log('  1. sudo apt update');
      console.log('  2. sudo apt install -y nodejs npm curl');
      console.log('  3. curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh');
      console.log('  4. sudo apt install -y libwebkit2gtk-4.0-dev build-essential');
      break;
  }
}

// Check prerequisites
const hasNode = checkCommand('node', 'Node.js');
const hasNpm = checkCommand('npm', 'npm');
const hasCargo = checkCommand('cargo', 'Rust (Cargo)');

if (!hasNode || !hasNpm || !hasCargo) {
  console.log('\n⚠️  Some prerequisites are missing!');
  installInstructions();
  process.exit(1);
}

// Install dependencies
console.log('\n📦 Installing dependencies...\n');

try {
  console.log('Installing npm packages...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('\nInstalling Rust dependencies...');
  process.chdir('src-tauri');
  execSync('cargo fetch', { stdio: 'inherit' });
  
  console.log('\n✅ Setup complete!');
  console.log('\n🚀 Quick Start:');
  console.log('   npm run dev      - Start development server');
  console.log('   npm run build    - Build production app');
  console.log('   npm run tauri-dev - Start with Tauri hot reload');
  
} catch (error) {
  console.error('\n❌ Setup failed:', error.message);
  process.exit(1);
}
