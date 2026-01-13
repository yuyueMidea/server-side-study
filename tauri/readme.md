# Tauri 简介

## 一、Tauri 是什么？

**Tauri** 是一个用于构建 **跨平台桌面应用** 的现代框架，核心思想是：

> **使用 Web 技术做界面，用 Rust 提供原生能力，用系统自带 WebView 进行渲染**

这使得 Tauri 能够在保证性能和安全性的同时，极大地降低桌面应用的体积和资源占用。

---

## 二、核心架构

```
前端（HTML / CSS / JS / React / Vue）
        ↓ invoke
Tauri 通信桥
        ↓
Rust 后端（命令 / 系统能力）
        ↓
操作系统（文件 / 数据库 / 网络 / 原生 API）
```

* **前端**：负责 UI 与交互逻辑
* **Rust 后端**：负责系统能力、本地数据、安全控制
* **WebView**：使用操作系统自带组件渲染页面

---

## 三、为什么选择 Tauri？

### 1️⃣ 体积小

| 框架        | 打包体积（Hello World） |
| --------- | ----------------- |
| Electron  | 80MB+             |
| **Tauri** | **3–10MB**        |

原因：

* 不内置 Chromium
* 复用系统 WebView

---

### 2️⃣ 性能好、资源占用低

* 启动快
* 内存占用低
* Rust 原生性能

非常适合：

* 工具类应用
* 本地管理软件
* 开发者工具

---

### 3️⃣ 安全性高（默认安全）

Tauri 采用 **白名单机制（Allowlist）**：

* 默认 **禁止** 访问系统能力
* 必须在配置中显式开启

```json
{
  "tauri": {
    "allowlist": {
      "fs": {
        "readFile": true
      }
    }
  }
}
```

相比 Electron，更不容易误暴露系统权限。

---

## 四、Tauri vs Electron

| 对比项  | Tauri       | Electron |
| ---- | ----------- | -------- |
| 打包体积 | ⭐⭐⭐⭐⭐       | ⭐        |
| 启动速度 | ⭐⭐⭐⭐        | ⭐⭐       |
| 内存占用 | ⭐⭐⭐⭐        | ⭐        |
| 安全模型 | 白名单         | 默认开放     |
| 学习成本 | 中（需少量 Rust） | 低        |

**结论：**

* 轻量工具 / 客户端应用 → 推荐 **Tauri**
* 超大型 Web 应用 → Electron 仍可选

---

## 五、Tauri 适合做什么？

非常适合以下场景：

* 📦 本地工具类软件
* 🧰 开发者工具
* 📝 本地表单 / 配置管理器
* 📊 日志查看 / 数据分析工具
* 🖥️ 运维 / 内部系统客户端

不太适合：

* 重度依赖浏览器特性的应用
* 需要完全一致 Web 环境的复杂前端

---

## 六、Tauri 技术栈组成

| 层级 | 技术                                     |
| -- | -------------------------------------- |
| UI | HTML / CSS / JS / React / Vue / Svelte |
| 桥梁 | Tauri IPC（invoke）                      |
| 后端 | Rust                                   |
| 渲染 | 系统 WebView                             |
| 打包 | 原生安装包（MSI / DMG / AppImage）            |

---

## 七、Tauri 的核心能力

* 前端调用 Rust（invoke）
* 文件系统访问
* SQLite / 本地数据库
* 系统对话框
* 系统通知
* 多窗口 / 托盘
* 自动更新

---

## 八、一个最小示例（概念）

### Rust 后端

```rust
#[tauri::command]
fn greet(name: String) -> String {
    format!("你好，{}！", name)
}
```

### 前端调用

```ts
import { invoke } from "@tauri-apps/api/core";

const msg = await invoke<string>("greet", { name: "Tauri" });
```

---

## 九、总结

**Tauri 是一个：**

* 🚀 轻量
* 🔐 安全
* ⚡ 高性能
* 🧩 前后端分离清晰

的现代桌面应用解决方案。

如果你：

* 会前端
* 想做桌面应用
* 又不想忍受 Electron 的臃肿

👉 **Tauri 是非常值得投入的选择。**

---

## 十、快速上手（Quick Start）

本章节帮助你在 **10 分钟内跑起第一个 Tauri 应用**，适合第一次接触 Tauri 的新手。

---

### 1️⃣ 环境准备

请确保本机已安装以下工具：

* **Node.js**（推荐 LTS）
* **Rust**（通过 rustup 安装）

验证安装：

```bash
node -v
npm -v
rustc --version
cargo --version
```

---

### 2️⃣ 创建 Tauri 项目

使用官方脚手架（推荐）：

```bash
npm create tauri-app@latest
```

示例选择：

```text
✔ Project name: tauri-demo
✔ Frontend language: TypeScript
✔ Frontend framework: React
✔ Package manager: npm
```

进入项目并安装依赖：

```bash
cd tauri-demo
npm install
```

---

### 3️⃣ 启动开发模式

```bash
npm run tauri dev
```

如果一切正常，你将看到：

* 一个 **桌面窗口**（不是浏览器）
* 前端由 React 渲染

---

### 4️⃣ 第一次前端 ↔ Rust 通信

#### Rust（后端命令）

```rust
#[tauri::command]
fn greet(name: String) -> String {
    format!("你好，{}！来自 Rust 👋", name)
}
```

注册命令：

```rust
.invoke_handler(tauri::generate_handler![greet])
```

#### React（前端调用）

```ts
import { invoke } from "@tauri-apps/api/core";

const msg = await invoke<string>("greet", { name: "Tauri" });
console.log(msg);
```

---

### 5️⃣ 打包成安装包

开发完成后，执行：

```bash
npm run tauri build
```

生成的安装包位于：

```text
src-tauri/target/release/bundle/
```

不同平台生成不同格式：

* Windows：`.msi`
* macOS：`.dmg`
* Linux：`.AppImage` / `.deb`

---

### 6️⃣ 常见问题速查

* ❌ **窗口白屏**：检查前端 dev server 是否启动
* ❌ **invoke 报错**：确认 Rust 命令已注册
* ❌ **系统能力不可用**：检查 `tauri.conf.json` 中的 allowlist

---

完成以上步骤，你已经成功跑起并打包了 **第一个 Tauri 桌面应用** 🎉

---

## 十一、推荐学习路径

1. Tauri 基础 + invoke 通信
2. Rust 最小子集（函数 / Result / Struct）
3. 本地文件 / SQLite
4. 打包发布
5. 进阶：托盘 / 自动更新 / 多窗口

---

> 本 README 适合作为：
>
> * 项目说明文档
> * 技术选型介绍
> * 团队内部学习资料
