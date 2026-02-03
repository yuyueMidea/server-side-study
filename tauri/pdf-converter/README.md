# PDF 万能转换器

一个基于 **Tauri v2 + React.js + Tailwind CSS v3** 构建的桌面应用，支持多种文档格式之间的互相转换。

![PDF Converter](./preview.png)

## ✨ 功能特点

- 🔄 **多格式支持**: PDF、Word (DOC/DOCX)、TXT、Markdown、HTML 格式互转
- 🚀 **快速转换**: 本地处理，秒级完成文档转换
- 🔒 **隐私安全**: 文件不上传到任何服务器，确保数据安全
- 🎨 **精美界面**: 现代化玻璃态 UI 设计，流畅的动画效果
- 📱 **跨平台**: 支持 Windows、macOS、Linux

## 🛠️ 技术栈

- **前端框架**: React 18
- **桌面框架**: Tauri v2
- **样式**: Tailwind CSS v3
- **构建工具**: Vite 5
- **转换库**: 
  - marked (Markdown 解析)
  - turndown (HTML 转 Markdown)
  - jsPDF (PDF 生成)
  - mammoth (Word 文档处理)

## 📦 安装与运行

### 前提条件

确保已安装以下环境：

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (最新稳定版)
- [Tauri CLI](https://v2.tauri.app/start/prerequisites/)

### 安装步骤

1. **克隆或解压项目**

```bash
unzip pdf-converter.zip
cd pdf-converter
```

2. **安装依赖**

```bash
npm install
```

3. **开发模式运行**

```bash
npm run tauri dev
```

4. **构建生产版本**

```bash
npm run tauri build
```

构建完成后，可执行文件位于 `src-tauri/target/release/` 目录。

## 📁 项目结构

```
pdf-converter/
├── public/                 # 静态资源
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   │   ├── Header.jsx
│   │   ├── FileDropZone.jsx
│   │   ├── FormatSelector.jsx
│   │   ├── ConversionPanel.jsx
│   │   ├── ConversionHistory.jsx
│   │   └── AnimatedBackground.jsx
│   ├── hooks/              # 自定义 Hooks
│   │   └── useFileConverter.js
│   ├── utils/              # 工具函数
│   │   ├── fileUtils.js
│   │   └── converters.js
│   ├── styles/             # 样式文件
│   │   └── index.css
│   ├── App.jsx             # 主应用组件
│   └── main.jsx            # 入口文件
├── src-tauri/              # Tauri/Rust 后端
│   ├── src/
│   │   ├── lib.rs          # 核心转换逻辑
│   │   └── main.rs         # 主入口
│   ├── Cargo.toml          # Rust 依赖配置
│   └── tauri.conf.json     # Tauri 配置
├── package.json            # 前端依赖配置
├── vite.config.ts          # Vite 配置
├── tailwind.config.js      # Tailwind 配置
└── README.md               # 项目说明
```

## 🔄 支持的转换格式

| 源格式 | 可转换为 |
|--------|----------|
| PDF | TXT, MD, HTML, DOCX |
| DOC/DOCX | PDF, TXT, MD, HTML |
| TXT | PDF, MD, HTML, DOCX |
| Markdown | PDF, TXT, HTML, DOCX |
| HTML | PDF, TXT, MD, DOCX |

## 🎯 使用说明

1. **选择文件**: 拖放文件到上传区域，或点击选择文件
2. **选择目标格式**: 从可用格式中选择要转换的目标格式
3. **开始转换**: 点击"开始转换"按钮
4. **下载文件**: 转换完成后自动下载

## 🎨 界面预览

- **主界面**: 文件上传和格式选择
- **转换历史**: 查看所有转换记录
- **动画背景**: 粒子动画效果

## 🔧 开发

### 前端开发

```bash
npm run dev
```

### Rust 后端开发

```bash
cd src-tauri
cargo build
```

### 代码检查

```bash
npm run lint
```

## 📝 更新日志

### v1.0.0
- 初始版本发布
- 支持 PDF、DOC、TXT、MD、HTML 格式转换
- 实现玻璃态 UI 设计
- 添加转换历史记录功能

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系

如有问题，请提交 Issue。
