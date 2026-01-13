# 系统监控与清理工具

一个基于 Tauri + React 开发的跨平台桌面应用,提供实时系统监控、磁盘清理和大文件查找功能。

## ✨ 功能特性

### 📊 实时系统监控
- **CPU 监控**: 实时显示 CPU 使用率,包含历史曲线图
- **内存监控**: 显示内存使用情况,包含使用百分比和历史趋势
- **磁盘监控**: 查看所有磁盘分区的使用情况
- **网络监控**: 实时显示上传/下载速度和累计流量
- **进程统计**: 显示当前运行的进程数量
- **系统运行时间**: 显示系统已运行时长

### 🧹 系统清理
- 一键清理临时文件
- 清理系统缓存
- Windows Prefetch 清理
- 显示清理结果统计(文件数、释放空间)

### 📁 大文件查找
- 扫描指定目录查找大文件
- 可自定义最小文件大小
- 显示扫描进度
- 支持直接删除文件
- 支持打开文件所在位置

### 🔔 系统托盘
- 最小化到系统托盘
- 托盘菜单快速操作
- 后台持续监控

## 🚀 快速开始

### 前置要求

- Node.js 18+ 
- Rust 1.70+
- npm 或 yarn

### 安装依赖

```bash
# 安装前端依赖
npm install

# 安装 Tauri CLI (如果还没安装)
npm install -g @tauri-apps/cli
```

### 开发模式运行

```bash
npm run tauri dev
```

### 构建生产版本

```bash
npm run tauri build
```

构建完成后,可执行文件位于 `src-tauri/target/release/bundle/` 目录。

## 📂 项目结构

```
system-monitor/
├── src/                    # React 前端源码
│   ├── App.jsx            # 主应用组件
│   ├── main.jsx           # 入口文件
├── src-tauri/             # Rust 后端源码
│   ├── src/
│   │   ├── main.rs       # 主入口
│   │   ├── system_info.rs # 系统信息采集
│   │   └── cleaner.rs    # 清理功能
│   ├── Cargo.toml        # Rust 依赖
│   └── tauri.conf.json   # Tauri 配置
├── package.json          # Node 依赖
└── README.md            # 项目说明
```

## 🛠️ 技术栈

### 前端
- **React 18**: UI 框架
- **Recharts**: 图表库,用于绘制实时监控曲线
- **Tailwind CSS**: 样式框架
- **Vite**: 构建工具

### 后端
- **Rust**: 系统级编程语言
- **Tauri**: 桌面应用框架
- **sysinfo**: 系统信息获取
- **tokio**: 异步运行时
- **walkdir**: 文件系统遍历

## 🔑 核心实现

### 系统信息采集
使用 `sysinfo` crate 获取系统底层信息:
- CPU 使用率通过 `System::global_cpu_info()` 获取
- 内存信息通过 `System::used_memory()` 和 `System::total_memory()` 获取
- 磁盘信息通过 `System::disks()` 遍历所有分区
- 网络统计通过 `System::networks()` 获取

### 实时数据推送
后端使用 tokio 定时任务每秒采集一次系统信息,通过 Tauri 的 `window.emit()` 推送到前端:

```rust
tauri::async_runtime::spawn(async move {
    let mut interval = time::interval(Duration::from_secs(1));
    loop {
        interval.tick().await;
        let info = monitor.get_system_info();
        let _ = window.emit("system-info-update", &info);
    }
});
```

### 文件清理
使用 `walkdir` 遍历临时目录,通过 `std::fs::remove_file()` 删除文件。支持 Windows、Linux、macOS 的临时目录:

```rust
// Windows: %TEMP%, %TMP%, C:\Windows\Prefetch
// Linux/macOS: /tmp, ~/.cache
```

### 大文件扫描
递归遍历指定目录,过滤大于指定大小的文件,并实时推送扫描进度到前端。

## ⚠️ 权限说明

本应用需要以下系统权限:
- **文件系统访问**: 用于扫描和清理文件
- **系统信息读取**: 用于获取 CPU、内存等信息
- **进程管理**: 部分清理操作可能需要管理员权限

在 Windows 上清理某些系统文件可能需要以管理员身份运行。

## 🔒 安全特性

- 删除文件前需要用户确认
- 只清理标准临时目录,不会误删重要文件
- 所有文件操作都有完整的错误处理
- 不收集或上传任何用户数据

## 📝 自检清单

### 功能完整性验证

✅ **系统监控**
- [x] CPU 使用率实时显示
- [x] CPU 历史曲线图
- [x] 内存使用率实时显示
- [x] 内存历史曲线图
- [x] 磁盘使用情况显示
- [x] 网络速度显示
- [x] 进程数统计
- [x] 系统运行时间

✅ **系统清理**
- [x] 临时文件清理
- [x] 清理结果统计
- [x] 错误处理和提示
- [x] 确认对话框

✅ **大文件查找**
- [x] 自定义扫描路径
- [x] 自定义最小文件大小
- [x] 扫描进度显示
- [x] 文件列表展示
- [x] 文件删除功能
- [x] 打开文件位置

✅ **系统托盘**
- [x] 最小化到托盘
- [x] 托盘菜单
- [x] 点击托盘图标显示窗口

✅ **性能优化**
- [x] 后台异步采集数据
- [x] 数据历史记录限制(60条)
- [x] 前端按需更新

### 跨平台兼容性

- ✅ Windows 10/11
- ✅ macOS 10.15+
- ✅ Linux (Ubuntu, Fedora等)

## 🐛 已知问题

1. 在某些 Linux 发行版上,网络速度统计可能不准确
2. macOS 上需要授予完全磁盘访问权限才能扫描某些系统目录
3. 清理操作可能因权限不足而跳过某些文件

## 🚧 未来计划

- [ ] 添加进程管理器
- [ ] 支持自定义清理规则
- [ ] 添加启动项管理
- [ ] 支持定时清理任务
- [ ] 添加磁盘碎片整理
- [ ] 多语言支持

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request!

---

**注意**: 本应用涉及系统底层操作,请确保了解每个功能的作用后再使用。建议在非生产环境先进行测试。
