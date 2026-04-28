#!/bin/bash
# LAN-IM Setup & Run Script
set -e

echo "════════════════════════════════════════════"
echo "  LAN·IM — 内网即时通讯 Setup"
echo "════════════════════════════════════════════"
echo ""

# Check prerequisites
check_cmd() {
  if ! command -v "$1" &> /dev/null; then
    echo "❌  $1 未安装，请先安装: $2"
    exit 1
  fi
  echo "✅  $1 已就绪"
}

echo "▶ 检查依赖..."
check_cmd node  "https://nodejs.org"
check_cmd npm   "https://nodejs.org"
check_cmd cargo "https://rustup.rs"

# Install npm deps
echo ""
echo "▶ 安装 npm 依赖..."
npm install

# Install Tauri CLI
echo ""
echo "▶ 安装 Tauri CLI..."
npm install @tauri-apps/cli

# Generate placeholder icons (required by Tauri)
echo ""
echo "▶ 生成占位图标..."
mkdir -p src-tauri/icons
# Create a minimal PNG icon using node
node -e "
const fs = require('fs');
// Minimal 1x1 transparent PNG
const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000020000000200806000000737a7af4000000097048597300000ec400000ec401952b0e1b0000001a49444154789c6360f8cfc0c0c0c000000000ffff03000006000557756e6c0000000049454e44ae426082','hex');
const sizes = ['32x32','128x128','128x128@2x'];
sizes.forEach(s => fs.writeFileSync('src-tauri/icons/' + s + '.png', png));
fs.writeFileSync('src-tauri/icons/icon.png', png);
console.log('Icons created');
"

echo ""
echo "════════════════════════════════════════════"
echo "  ✅  设置完成！"
echo ""
echo "  开发模式运行:"
echo "    npm run tauri dev"
echo ""
echo "  生产构建:"
echo "    npm run tauri build"
echo ""
echo "  注意：首次编译 Rust 依赖需要 5-10 分钟"
echo "════════════════════════════════════════════"
