# LAN·IM — 内网即时通讯桌面软件

> 基于 Tauri 2.0 + Vue 3 + WebRTC 的局域网 P2P 即时通讯 MVP

---

## ✨ 功能

| 功能 | 实现方式 |
|------|----------|
| 局域网自动发现 | UDP 广播（端口 49876），每 5 秒心跳 |
| 即时文字通讯 | WebRTC DataChannel（优先），WebSocket（降级） |
| 高速文件传输 | WebRTC DataChannel 64KB 分块流式传输 |
| 本地消息持久化 | SQLite（rusqlite bundled） |
| 消息加密 | AES-256-GCM（crypto.rs） |
| 系统托盘 | Tauri tray-icon，点击切换显示/隐藏 |
| 最小化到托盘 | 关闭按钮拦截，仅隐藏窗口 |

---

## 🚀 快速启动

### 前提条件

- [Node.js](https://nodejs.org) ≥ 18
- [Rust](https://rustup.rs) (stable)
- 系统依赖（Linux）：`sudo apt install libwebkit2gtk-4.1-dev libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`

### 安装与运行

```bash
# 1. 克隆或解压项目
cd lan-im

# 2. 一键安装（或手动执行下面的步骤）
bash setup.sh

# 3. 开发模式启动（热重载）
npm run tauri dev

# 4. 打包发布版本
npm run tauri build
```

---

## 📁 目录结构

```
lan-im/
├── src/                        # Vue 3 前端
│   ├── assets/main.css         # TailwindCSS 全局样式
│   ├── components/
│   │   ├── Avatar.vue          # 用户头像（颜色哈希）
│   │   ├── ChatWindow.vue      # 聊天主窗口（含文件拖拽）
│   │   ├── FileTransferBanner.vue  # 文件传输进度条
│   │   └── MessageList.vue     # 消息列表（气泡 + 时间分组）
│   ├── stores/index.js         # Pinia 状态（identity/peers/messages/connection）
│   ├── utils/webrtc.js         # WebRTC P2P 连接管理器
│   ├── views/
│   │   ├── Setup.vue           # 首次启动设置页
│   │   └── Main.vue            # 主布局（侧边栏 + 聊天区）
│   ├── router.js
│   ├── App.vue
│   └── main.js
├── src-tauri/
│   ├── src/
│   │   ├── main.rs             # 程序入口
│   │   ├── lib.rs              # Tauri 构建 + 托盘设置
│   │   ├── commands.rs         # Tauri invoke 命令暴露层
│   │   ├── discovery.rs        # UDP 局域网发现服务（异步）
│   │   ├── db.rs               # SQLite 增删查（rusqlite）
│   │   └── crypto.rs           # AES-256-GCM 加解密
│   ├── capabilities/default.json
│   ├── tauri.conf.json         # Tauri 2.0 配置
│   └── Cargo.toml
├── index.html
├── vite.config.js
├── tailwind.config.js
├── package.json
└── setup.sh
```

---

## 🔧 技术架构

```
┌─────────────────────────────────────────────┐
│               Vue 3 前端 (Vite)              │
│  Setup → Main Layout → ChatWindow           │
│  Pinia Store: peers / messages / connection │
│  WebRTC Manager (offer/answer/ice + DC)     │
└──────────────┬──────────────────────────────┘
               │ Tauri IPC (invoke / emit)
┌──────────────▼──────────────────────────────┐
│            Rust 后端 (Tauri 2.0)            │
│  commands.rs   → invoke 命令路由             │
│  discovery.rs  → UDP 广播 + 监听            │
│  db.rs         → SQLite CRUD               │
│  crypto.rs     → AES-256-GCM              │
└──────────────┬──────────────────────────────┘
               │ OS / Network
     UDP:49876 (发现) + WebRTC STUN
```

### 通信流程

```
A 启动 ──UDP广播──▶ B 发现 A
B 启动 ──UDP广播──▶ A 发现 B
A 选择 B ──RTCPeerConnection──▶ createOffer
         ──send_signal (UDP)──▶ B 收到 offer
B ──createAnswer──▶ send_signal ──▶ A
ICE 候选交换（同 UDP 信令）
DataChannel "chat" OPEN ✓
消息/文件通过 DataChannel 直接 P2P 传输
若 DataChannel 失败 → 降级 WebSocket
```

---

## 📝 注意事项

1. **防火墙**：确保 UDP 49876 在局域网内可通。
2. **首次编译**：Rust 依赖较多，首次 `npm run tauri dev` 需要 5~10 分钟。
3. **多机测试**：将同一代码在两台同一局域网的电脑上运行即可自动互相发现。
4. **文件传输**：拖拽文件到聊天输入框，或点击附件图标选择文件。
5. **离线记录**：关闭软件重新打开后，历史消息会从 SQLite 自动加载。

---

## 🔒 安全说明

- 消息在 DataChannel 层通过 AES-256-GCM 加密
- 所有数据仅在局域网内传输，不经过任何公网服务器
- 密钥派生基于 `crypto.rs` 中的 `derive_key` 函数，生产环境建议替换为 ECDH 密钥交换
