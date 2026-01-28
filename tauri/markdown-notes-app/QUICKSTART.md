# 快速启动指南

## 🚀 一键启动 (推荐)

### 方法 1: 直接运行
```bash
cd markdown-notes-app
npm install && npm run tauri dev
```

### 方法 2: 分步执行
```bash
# 1. 进入项目目录
cd markdown-notes-app

# 2. 安装依赖 (首次运行)
npm install

# 3. 启动开发服务器
npm run tauri dev
```

---

## 📋 前置要求检查

### 必需工具
- ✅ Node.js >= 18
- ✅ Rust >= 1.70
- ✅ 系统依赖 (根据平台)

### 检查命令
```bash
# 检查 Node.js
node --version

# 检查 npm
npm --version

# 检查 Rust
rustc --version

# 检查 Cargo
cargo --version
```

---

## 🔧 系统依赖安装

### macOS
```bash
# 安装 Xcode Command Line Tools
xcode-select --install
```

### Windows
```bash
# 安装 Visual Studio C++ Build Tools
# 下载: https://visualstudio.microsoft.com/visual-cpp-build-tools/
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

### Linux (Fedora)
```bash
sudo dnf install -y \
  webkit2gtk4.1-devel \
  openssl-devel \
  curl \
  wget \
  file \
  libappindicator-gtk3-devel \
  librsvg2-devel
```

---

## 🎯 首次运行流程

### 步骤 1: 克隆/解压项目
```bash
# 如果是 Git 仓库
git clone <repository-url>
cd markdown-notes-app

# 或直接进入解压后的目录
cd markdown-notes-app
```

### 步骤 2: 安装依赖
```bash
npm install
```

**预计时间**: 2-5 分钟
**网络要求**: 需要稳定的网络连接

### 步骤 3: 启动应用
```bash
npm run tauri dev
```

**首次启动**: 
- Rust 依赖编译: 5-10 分钟
- 后续启动: 10-30 秒

---

## 📱 应用使用

### 自动创建的目录
应用首次运行会在用户主目录创建:
```
~/MarkdownNotes/
├── images/           # 图片存储
└── *.md             # Markdown 文件
```

### 快速开始
1. **创建笔记**: 点击左侧 `+` 按钮
2. **编辑内容**: 在中间编辑器输入
3. **查看预览**: 右侧实时显示
4. **自动保存**: 2 秒后自动保存

---

## 🏗️ 构建生产版本

### 开发版本 (调试)
```bash
npm run tauri dev
```

### 生产版本 (发布)
```bash
npm run tauri build
```

**构建产物位置**:
```
src-tauri/target/release/bundle/
├── dmg/              # macOS
├── msi/              # Windows
├── deb/              # Linux (Debian/Ubuntu)
└── appimage/         # Linux (通用)
```

---

## ⚡ 性能优化建议

### 开发环境
```bash
# 使用 --release 模式 (更快但编译时间长)
npm run tauri dev -- --release
```

### 清理缓存
```bash
# 清理 node_modules
rm -rf node_modules
npm install

# 清理 Rust 构建缓存
cd src-tauri
cargo clean
cd ..
```

---

## 🐛 常见问题排查

### 问题 1: 依赖安装失败
**解决方法**:
```bash
# 清理缓存
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 问题 2: Rust 编译错误
**解决方法**:
```bash
# 更新 Rust
rustup update

# 检查 Rust 版本
rustc --version
```

### 问题 3: Tauri 启动失败
**解决方法**:
```bash
# 检查系统依赖
# macOS: 确认已安装 Xcode Command Line Tools
# Windows: 确认已安装 Visual Studio Build Tools
# Linux: 确认已安装 webkit2gtk
```

### 问题 4: 端口被占用
**错误信息**: `Port 1420 is already in use`

**解决方法**:
```bash
# 方法 1: 停止占用端口的进程
# macOS/Linux
lsof -ti:1420 | xargs kill -9

# Windows
netstat -ano | findstr :1420
taskkill /PID <PID> /F

# 方法 2: 修改端口
# 编辑 vite.config.js, 修改 port: 1420 为其他端口
```

---

## 🔐 权限配置

### macOS
首次运行可能需要授权:
1. 系统偏好设置 → 安全性与隐私
2. 允许应用运行

### Linux
可能需要执行权限:
```bash
chmod +x markdown-notes-app
```

---

## 📊 启动时间参考

| 操作 | 首次 | 后续 |
|------|------|------|
| npm install | 2-5 min | - |
| Rust 编译 | 5-10 min | - |
| 启动应用 | 30-60 sec | 10-30 sec |
| 总计 (首次) | 8-16 min | 10-30 sec |

**注意**: 时间因硬件和网络而异

---

## 🎓 学习资源

### 官方文档
- [Tauri 文档](https://tauri.app/)
- [React 文档](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

### 项目文档
- `README.md`: 项目介绍
- `DEVELOPMENT.md`: 开发文档
- `CHECKLIST.md`: 功能清单

---

## 🆘 获取帮助

### 日志查看
```bash
# 开发模式自动显示日志
npm run tauri dev

# 查看详细日志
RUST_LOG=debug npm run tauri dev
```

### 调试工具
- **前端调试**: 按 F12 打开 DevTools
- **Rust 调试**: 使用 `println!()` 或 `eprintln!()`

### 问题反馈
如果遇到问题,请提供:
1. 操作系统和版本
2. Node.js 和 Rust 版本
3. 错误信息截图
4. 完整的错误日志

---

## ✅ 验证清单

启动前检查:
- [ ] Node.js 已安装 (>= 18)
- [ ] Rust 已安装 (>= 1.70)
- [ ] 系统依赖已安装
- [ ] 网络连接正常
- [ ] 磁盘空间充足 (>2GB)

首次运行检查:
- [ ] 依赖安装成功
- [ ] Rust 编译成功
- [ ] 应用窗口打开
- [ ] 可以创建笔记
- [ ] 自动保存正常

---

## 🎉 完成!

如果应用成功启动,你应该看到:
1. 应用窗口打开
2. 左侧显示文件树
3. 中间显示编辑器
4. 右侧显示预览

现在可以开始使用 Markdown Notes 了!
