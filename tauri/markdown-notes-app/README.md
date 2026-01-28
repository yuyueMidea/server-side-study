# Markdown Notes App

一个基于 Tauri v2 + React + Tailwind CSS 开发的本地优先 Markdown 笔记应用。

## ✨ 核心功能

### 1. Markdown 编辑
- 🎨 实时预览
- 🔤 语法高亮
- 🛠️ 富文本工具栏
- ⌨️ 快捷插入常用格式

### 2. 文件管理
- 📁 文件树导航
- ➕ 创建/删除文件
- 💾 自动保存 (2秒延迟)
- 🔄 实时同步

### 3. 图片处理
- 📸 图片上传和嵌入
- 💿 本地存储管理
- 🖼️ 自动生成唯一文件名

### 4. 多格式导出
- 📄 HTML 导出 (带样式)
- 📑 PDF 导出
- 📝 Markdown 原文

### 5. 离线优先
- 🔌 无需网络连接
- 💾 本地数据持久化
- ⚡ 快速响应

## 🏗️ 技术架构

### 前端层
- **框架**: React 18
- **样式**: Tailwind CSS 3
- **状态管理**: Zustand
- **Markdown 渲染**: react-markdown + remark-gfm
- **代码高亮**: react-syntax-highlighter
- **图标**: lucide-react

### 后端层 (Tauri + Rust)
- **文件操作**: std::fs
- **Markdown 解析**: comrak
- **PDF 生成**: printpdf
- **图片处理**: base64 + image crate
- **插件**: tauri-plugin-fs, tauri-plugin-dialog

## 📦 安装与运行

### 前置要求
- Node.js >= 18
- Rust >= 1.70
- Tauri CLI

### 安装依赖
```bash
# 安装前端依赖
npm install

安装 typography 插件

npm install -D @tailwindcss/typography

# 如果需要安装 Tauri CLI
npm install -g @tauri-apps/cli
```

### 开发模式
```bash
npm run tauri dev
```

### 构建应用
```bash
npm run tauri build
```

构建后的应用位于 `src-tauri/target/release/bundle/`

## 📁 项目结构

```
markdown-notes-app/
├── src/                          # React 前端
│   ├── components/
│   │   ├── Editor.jsx            # Markdown 编辑器
│   │   ├── Preview.jsx           # 实时预览
│   │   ├── Sidebar.jsx           # 文件树侧边栏
│   │   └── Toolbar.jsx           # 工具栏
│   ├── hooks/
│   │   └── useAutoSave.js        # 自动保存 Hook
│   ├── store/
│   │   └── useStore.js           # Zustand 状态管理
│   ├── App.jsx                   # 主应用组件
│   ├── main.jsx                  # React 入口
│   └── index.css                 # 全局样式
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   └── main.rs               # Tauri 主程序
│   ├── Cargo.toml                # Rust 依赖
│   ├── tauri.conf.json           # Tauri 配置
│   └── build.rs                  # 构建脚本
├── package.json                  # NPM 配置
├── vite.config.js                # Vite 配置
├── tailwind.config.js            # Tailwind 配置
└── README.md                     # 项目说明
```

## 🚀 功能使用指南

### 创建新笔记
1. 点击侧边栏顶部的 `+` 按钮
2. 输入文件名 (自动添加 .md 扩展名)
3. 按 Enter 或点击"创建"按钮

### 编辑笔记
1. 在侧边栏选择要编辑的笔记
2. 使用工具栏快速插入格式
3. 内容会自动保存 (2秒延迟)

### 插入图片
1. 点击工具栏的图片图标
2. 选择本地图片文件
3. 图片会自动上传并插入 Markdown 语法

### 导出笔记
1. 点击工具栏的"导出"按钮
2. 选择导出格式 (HTML/PDF)
3. 选择保存位置

### 快捷键
- **Ctrl/Cmd + S**: 手动保存
- 工具栏按钮提供快速格式化

## 🎨 自定义配置

### 修改自动保存延迟
编辑 `src/App.jsx`:
```javascript
useAutoSave(2000); // 修改为其他毫秒值
```

### 修改笔记存储位置
默认存储在 `~/MarkdownNotes/`，可在 `src/store/useStore.js` 中修改:
```javascript
const notesPath = await join(home, 'MarkdownNotes'); // 修改目录名
```

### 自定义主题色
编辑 `tailwind.config.js`:
```javascript
colors: {
  primary: {
    // 修改主题色
  }
}
```

## 🔧 技术细节

### Tauri Commands (Rust -> JavaScript)
- `read_file`: 读取文件内容
- `write_file`: 写入文件内容
- `create_file`: 创建新文件
- `delete_file`: 删除文件
- `list_files`: 列出目录文件
- `export_html`: 导出 HTML
- `export_pdf`: 导出 PDF
- `save_image`: 保存图片

### 状态管理 (Zustand)
全局状态包括:
- 文件列表
- 当前文件
- 编辑内容
- UI 状态 (侧边栏、预览)
- 保存状态

### 自动保存机制
使用 React Hook 实现防抖保存:
- 2秒内无新输入时触发保存
- 只在内容变化时保存
- 显示保存状态和时间

## 📝 开发笔记

### 已实现功能
✅ Markdown 实时编辑和预览
✅ 文件树导航
✅ 自动保存
✅ 图片上传和嵌入
✅ HTML 导出
✅ PDF 导出 (简化版)
✅ 工具栏快捷格式化
✅ 响应式布局

### 可扩展功能
🔄 搜索功能
🔄 标签系统
🔄 云同步
🔄 协作编辑
🔄 更丰富的 PDF 排版
🔄 主题切换
🔄 快捷键系统
🔄 版本历史

## 🐛 已知问题

1. PDF 导出功能较简单，仅支持基础文本
2. 大文件 (>10MB) 可能影响性能
3. 图片不会被压缩

## 📄 许可证

MIT License

## 👨‍💻 作者

开发者: [Your Name]
