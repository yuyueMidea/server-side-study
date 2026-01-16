# Markdown 编辑器

一款使用 Tauri v2 + React + Tailwind CSS 构建的现代化桌面 Markdown 编辑器。

## ✨ 功能特性

### 核心编辑功能
- ✅ 实时预览 - 左右分屏，实时渲染
- ✅ 语法高亮 - 代码块自动高亮显示
- ✅ 丰富的工具栏 - 快速插入格式
- ✅ 无干扰模式 - 专注写作

### 文件管理
- ✅ 打开/保存文件
- ✅ 另存为
- ✅ 自动检测修改状态
- ✅ 文件拖放支持

### 导出功能
- ✅ 导出为 HTML
- ✅ 带样式的完整 HTML 文档

### 编辑辅助
- ✅ 搜索功能
- ✅ 字数统计
- ✅ 行数统计
- ✅ 光标位置显示

### 外观定制
- ✅ 明暗主题切换
- ✅ 响应式布局
- ✅ 优雅的 UI 设计

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Rust 1.70+
- pnpm / npm / yarn

### 完整安装步骤

\`\`\`bash
# 1. 创建项目目录并进入
mkdir markdown-editor && cd markdown-editor

# 2. 初始化项目（复制所有提供的文件到对应位置）

# 3. 安装所有依赖（一次性安装所有包含的库）
npm install

# package.json 已包含以下所有依赖，无需单独安装：
# - @tauri-apps/api (Tauri API)
# - @tauri-apps/plugin-dialog (文件对话框)
# - @tauri-apps/plugin-fs (文件系统)
# - lucide-react (图标库)
# - react & react-dom (React 框架)
# - marked (Markdown 解析器)
# - highlight.js (代码高亮)
# - @tailwindcss/typography (排版插件)
# - tailwindcss, postcss, autoprefixer (样式工具)

# 4. 如果需要全局安装 Tauri CLI（可选）
cargo install tauri-cli --version "^2.0.0"
# 或使用 npm
npm install -g @tauri-apps/cli
\`\`\`

### 开发模式

\`\`\`bash
npm run tauri:dev
\`\`\`

### 构建应用

\`\`\`bash
npm run tauri:build
\`\`\`

构建完成后，安装包位于 `src-tauri/target/release/bundle/`

## 📖 使用说明

### 快捷键

- `Ctrl/Cmd + O` - 打开文件
- `Ctrl/Cmd + S` - 保存文件
- `Ctrl/Cmd + Shift + S` - 另存为
- `Ctrl/Cmd + F` - 搜索
- `ESC` - 退出无干扰模式
- `Tab` - 插入缩进

### 支持的 Markdown 语法

- 标题 (H1-H6)
- 粗体、斜体
- 列表 (有序/无序)
- 任务列表
- 代码块和行内代码
- 引用
- 链接和图片
- 表格
- 水平分隔线

## 🛠️ 技术栈

- **前端**: React 18 + Vite
- **样式**: Tailwind CSS 3
- **桌面框架**: Tauri v2
- **Markdown 解析**: marked
- **代码高亮**: highlight.js
- **图标**: lucide-react

## 📦 项目结构

\`\`\`
markdown-editor/
├── src/                  # React 前端代码
│   ├── components/       # React 组件
│   ├── App.jsx          # 主应用组件
│   └── main.jsx         # 入口文件
├── src-tauri/           # Tauri 后端代码
│   ├── src/             # Rust 源码
│   ├── Cargo.toml       # Rust 依赖
│   └── tauri.conf.json  # Tauri 配置
└── package.json         # Node 依赖
\`\`\`

## 🔧 配置说明

### 文件权限

应用默认有以下目录的读写权限:
- 应用数据目录
- 文档目录
- 下载目录
- 用户主目录

可在 `tauri.conf.json` 中的 `fs.scope` 调整权限范围。

## 📝 待办事项

- [ ] PDF 导出
- [ ] 图片粘贴上传
- [ ] 更多主题
- [ ] 插件系统
- [ ] 自定义快捷键
- [ ] 多标签页支持
- [ ] Git 集成

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
\`\`\`

---

## 📋 依赖清单完整检查

### ✅ 前端依赖 (package.json - dependencies)
- ✅ `@tauri-apps/api` ^2.0.0 - Tauri 核心 API
- ✅ `@tauri-apps/plugin-dialog` ^2.0.0 - 文件对话框插件
- ✅ `@tauri-apps/plugin-fs` ^2.0.0 - 文件系统插件
- ✅ `lucide-react` ^0.263.1 - 图标库
- ✅ `react` ^18.3.1 - React 框架
- ✅ `react-dom` ^18.3.1 - React DOM
- ✅ `marked` ^11.2.0 - Markdown 解析器
- ✅ `highlight.js` ^11.9.0 - 代码语法高亮

### ✅ 开发依赖 (package.json - devDependencies)
- ✅ `@tauri-apps/cli` ^2.0.0 - Tauri 命令行工具
- ✅ `@vitejs/plugin-react` ^4.3.1 - Vite React 插件
- ✅ `@tailwindcss/typography` ^0.5.10 - Tailwind 排版插件
- ✅ `autoprefixer` ^10.4.19 - CSS 自动前缀
- ✅ `postcss` ^8.4.38 - CSS 后处理器
- ✅ `tailwindcss` ^3.4.3 - Tailwind CSS 框架
- ✅ `vite` ^5.2.11 - 构建工具

### ✅ Rust 依赖 (Cargo.toml)
- ✅ `tauri` 2.0 - Tauri 核心
- ✅ `tauri-plugin-dialog` 2.0 - 对话框插件
- ✅ `tauri-plugin-fs` 2.0 - 文件系统插件
- ✅ `serde` 1.0 - 序列化库
- ✅ `serde_json` 1.0 - JSON 支持

---

## 🔍 常见问题排查

### 问题1: `npm install` 失败
\`\`\`bash
# 清除缓存重试
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
\`\`\`

### 问题2: Tauri CLI 找不到
\`\`\`bash
# 使用 npx 运行（无需全局安装）
npx tauri dev
npx tauri build
\`\`\`

### 问题3: Rust 未安装
\`\`\`bash
# Linux/macOS
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows
# 访问 https://rustup.rs/ 下载安装器
\`\`\`

### 问题4: highlight.js 样式未生效
检查 `src/components/Preview.jsx` 中是否正确导入：
\`\`\`javascript
import 'highlight.js/styles/github-dark.css';
\`\`\`

---

## 🔍 安装步骤总结

1. **创建项目目录**:
   \`\`\`bash
   mkdir markdown-editor && cd markdown-editor
   \`\`\`

2. **复制所有文件**到对应位置

3. **安装依赖**:
   \`\`\`bash
   npm install
   # 这将自动安装以下所有依赖：
   # - @tauri-apps/api, plugin-dialog, plugin-fs
   # - react, react-dom
   # - lucide-react (图标)
   # - marked (Markdown 解析)
   # - highlight.js (代码高亮)
   # - tailwindcss, @tailwindcss/typography
   # - vite, @vitejs/plugin-react
   \`\`\`

4. **验证 Rust 环境** (首次使用 Tauri 需要):
   \`\`\`bash
   rustc --version
   # 如果未安装 Rust，访问 https://rustup.rs/
   \`\`\`

5. **运行开发模式**:
   \`\`\`bash
   npm run tauri:dev
   \`\`\`

6. **构建应用**:
   \`\`\`bash
   npm run tauri:build
   \`\`\`

---

## ✅ 功能自检清单

### 核心功能
- ✅ Tauri v2 桌面应用框架
- ✅ React 18 + Vite 前端
- ✅ Tailwind CSS 3 样式
- ✅ 实时 Markdown 预览
- ✅ 语法高亮 (highlight.js)
- ✅ 文件打开/保存/另存为
- ✅ HTML 导出
- ✅ 明暗主题切换
- ✅ 无干扰模式
- ✅ 搜索功能
- ✅ 字数/行数统计
- ✅ 丰富的编辑工具栏
- ✅ 文件修改状态提示
- ✅ 完整的 Markdown 语法支持

所有文件已生成完毕！这是一个完整可运行的 Tauri v2 桌面应用项目。
