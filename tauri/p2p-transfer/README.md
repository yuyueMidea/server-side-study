# XFER — P2P 文件传输工具

基于 **Tauri v2 + Vue3 + Rust/Tokio** 的跨平台点对点文件传输工具。
只要两台电脑能联网（局域网/公网均可），输入对方 IP 即可直接传输。

---

## 快速开始

### 环境要求

| 工具 | 版本 | 安装 |
|------|------|------|
| Rust | ≥ 1.75 | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Node.js | ≥ 18 | https://nodejs.org |
| Tauri CLI | v2 | 随 npm 依赖自动安装 |
| 系统依赖 | — | 见下方 |

**macOS**：无额外依赖（Xcode Command Line Tools 即可）

**Windows**：需安装 [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) 和 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

**Linux（Ubuntu/Debian）**：
```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

### 一键启动开发模式

```bash
# 1. 安装前端依赖
npm install

# 2. 启动（首次编译 Rust 需要 2-5 分钟）
npm run tauri dev
```

### 打包发布版本

```bash
npm run tauri build
# 产物在 src-tauri/target/release/bundle/
# macOS → .dmg
# Windows → .msi / .exe
# Linux → .deb / .AppImage
```

---

## 使用方式

```
电脑 A（发送方）          电脑 B（接收方）
┌─────────────────┐        ┌─────────────────┐
│  启动 XFER      │        │  启动 XFER      │
│                 │        │  侧边栏显示本机IP │
│  输入 B 的 IP   │──────► │  自动接收        │
│  选择文件       │        │  保存到下载目录   │
│  点击发送       │        │                 │
└─────────────────┘        └─────────────────┘
```

**接收方无需任何操作**，启动应用即自动监听 55001 端口。

---

## 项目结构

```
p2p-transfer/
├── src/                      # Vue3 前端
│   ├── main.ts               # 入口
│   └── App.vue               # 主界面（发送/接收/历史 三 Tab）
│
├── src-tauri/
│   ├── src/
│   │   ├── main.rs           # Tauri 入口 + 命令注册
│   │   ├── transfer.rs       # 核心传输逻辑（发送端 + 接收端）
│   │   └── protocol.rs       # 自定义二进制协议 + Codec
│   ├── build.rs              # Tauri 构建脚本（必需）
│   ├── Cargo.toml            # Rust 依赖
│   ├── tauri.conf.json       # Tauri 配置
│   └── capabilities/
│       └── default.json      # Tauri v2 权限声明
│
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 协议设计

### 帧格式

```
┌──────────────┬──────────────┬──────────────────────────────┐
│  type (4B)   │ length (8B)  │      payload (N bytes)        │
│  LE uint32   │  LE uint64   │  JSON / 二进制（FileChunk）    │
└──────────────┴──────────────┴──────────────────────────────┘
```

### FileChunk 二进制 payload（节省 base64 的 33% 开销）

```
┌───────────────┬────────────────┬──────────────────┬──────────────────┐
│ chunk_idx(8B) │ id_len (2B)    │ transfer_id (N B)│  raw file data   │
└───────────────┴────────────────┴──────────────────┴──────────────────┘
```

### 完整握手流程

```
发送方                         接收方（自动监听 :55001）
  │                               │
  │──── TCP connect ─────────────►│
  │──── Handshake(peer_id) ──────►│
  │◄─── Handshake(peer_id) ───────│
  │                               │
  │──── FileOffer(元信息+hash) ──►│
  │◄─── FileAccept ───────────────│
  │                               │
  │──── FileChunk × N ───────────►│  (256KB/chunk)
  │──── FileComplete(SHA256) ────►│
  │◄─── FileComplete(confirmed) ──│  (校验通过)
  │                               │
  └─────── 连接关闭 ──────────────┘
```

---

## 跨平台路径处理说明

| 问题 | 解决方案 |
|------|---------|
| 路径分隔符差异 | 使用 `std::path::PathBuf`，自动适配各平台 |
| 下载目录位置 | `app.path().download_dir()` — Tauri 跨平台 API |
| 路径穿越攻击 | 仅传输文件名，净化 `/ \ : * ? " < > \|` |
| 文件名 Unicode | Rust OsStr 原生支持 |

---

## 常见问题

**Q: 连接失败怎么办？**
- 检查防火墙是否放行 TCP 55001 端口
- Windows 系统：控制面板 → Windows Defender 防火墙 → 允许应用
- 确认两台机器在同一网络或端口可互访

**Q: 传输大文件会内存溢出吗？**
- 不会。发送端和接收端均采用流式读写（256KB/chunk），内存占用恒定

**Q: 文件保存在哪里？**
- 自动保存到系统下载目录：
  - Windows：`C:\Users\<用户名>\Downloads\`
  - macOS：`/Users/<用户名>/Downloads/`
  - Linux：`~/Downloads/`（或 `$XDG_DOWNLOAD_DIR`）

**Q: 文件传完能确保完整性吗？**
- 可以。发送前计算 SHA-256，接收端流式验证，不一致自动删除并报错
