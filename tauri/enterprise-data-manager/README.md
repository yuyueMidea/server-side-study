# 企业数据管理工具 (Enterprise Data Manager)

基于 Tauri v2 + React.js 开发的跨平台企业数据管理应用，支持客户管理、合同管理和设备台账三大核心功能。

## 功能特性

### 📊 三大核心模块

1. **客户管理 (CRM)**
   - 完整的客户信息管理（公司名称、联系人、电话、邮箱、地址等）
   - 强大的搜索功能
   - CSV 导入/导出

2. **合同管理**
   - 合同编号、客户、金额、日期等信息管理
   - 合同状态跟踪（待执行、执行中、已过期）
   - CSV 导入/导出

3. **设备台账**
   - 资产编号、设备信息、价格等完整记录
   - 设备状态管理（正常、维护中、损坏、已报废）
   - CSV 导入/导出

### 🚀 技术特性

- **本地 SQLite 数据库** - 数据完全存储在本地，安全可靠
- **跨平台支持** - Windows、macOS、Linux 全平台支持
- **文件导入导出** - 支持 CSV 格式数据批量导入导出
- **响应式设计** - 现代化的用户界面，支持各种屏幕尺寸
- **高性能** - Rust 后端 + React 前端，运行流畅

## 快速开始

### 前置要求

- Node.js 16+ 
- Rust 1.70+
- npm 或 yarn

### 安装步骤

1. **安装依赖**

```bash
# 安装前端依赖
npm install

# 安装 Tauri CLI（如果还没有）
npm install -g @tauri-apps/cli
```

2. **开发模式运行**

```bash
npm run tauri dev
```

3. **构建生产版本**

```bash
npm run tauri build
```

构建完成后，可执行文件将位于 `src-tauri/target/release/bundle/` 目录下。

## 项目结构

```
enterprise-data-manager/
├── src/                          # React 前端源码
│   ├── components/               # React 组件
│   │   ├── CustomerManagement.jsx
│   │   ├── ContractManagement.jsx
│   │   └── EquipmentManagement.jsx
│   ├── styles/                   # 样式文件
│   │   └── index.css
│   ├── App.jsx                   # 主应用组件
│   └── main.jsx                  # React 入口
│
├── src-tauri/                    # Tauri Rust 后端
│   ├── src/
│   │   ├── main.rs              # 应用入口
│   │   ├── database.rs          # 数据库操作
│   │   ├── models.rs            # 数据模型
│   │   └── commands.rs          # Tauri 命令
│   ├── Cargo.toml               # Rust 依赖配置
│   └── tauri.conf.json          # Tauri 配置
│
├── index.html                    # HTML 入口
├── package.json                  # Node.js 配置
├── vite.config.js               # Vite 构建配置
├── tailwind.config.js           # Tailwind CSS 配置
└── README.md                     # 项目文档
```

## 使用说明

### 客户管理

1. 点击"新增客户"按钮添加客户信息
2. 填写必填项：公司名称、联系人、电话
3. 可选填写：邮箱、地址、备注
4. 使用搜索框快速查找客户
5. 点击编辑/删除按钮管理现有客户

### 合同管理

1. 点击"新增合同"添加合同记录
2. 填写合同编号、客户名称、标题、金额
3. 设置合同开始和结束日期
4. 选择合同状态（待执行/执行中/已过期）
5. 支持按合同号、客户名或标题搜索

### 设备台账

1. 点击"新增设备"录入设备信息
2. 填写资产编号、设备名称、分类等
3. 记录购买日期、价格、存放位置
4. 设置设备状态（正常/维护中/损坏/已报废）
5. 支持多维度搜索设备

### 数据导入导出

#### 导出数据
1. 在任一管理模块点击"导出"按钮
2. 选择保存位置和文件名
3. 数据将以 CSV 格式导出

#### 导入数据
1. 准备符合格式的 CSV 文件
2. 点击"导入"按钮选择文件
3. 系统将自动导入数据到数据库

**CSV 格式示例（客户）：**
```csv
ID,公司名称,联系人,电话,邮箱,地址,备注
1,"ABC科技有限公司","张三","13800138000","zhangsan@abc.com","北京市朝阳区","重要客户"
```

## 数据存储

- 数据库文件：`data.db`
- 存储位置：应用数据目录
  - Windows: `%APPDATA%\com.enterprise.datamanager\`
  - macOS: `~/Library/Application Support/com.enterprise.datamanager/`
  - Linux: `~/.local/share/com.enterprise.datamanager/`

## 技术栈

### 前端
- **React 18** - UI 框架
- **Vite** - 构建工具
- **Tailwind CSS** - CSS 框架
- **Lucide React** - 图标库

### 后端
- **Tauri 2.0** - 应用框架
- **Rust** - 系统编程语言
- **SQLite** - 嵌入式数据库
- **rusqlite** - SQLite Rust 绑定

## 常见问题

### Q: 如何备份数据？
A: 直接复制应用数据目录下的 `data.db` 文件即可。

### Q: 可以在多台电脑之间同步数据吗？
A: 目前数据存储在本地，可以通过导出/导入 CSV 的方式在不同设备间传输数据。

### Q: 支持哪些操作系统？
A: 支持 Windows 10+、macOS 10.15+、主流 Linux 发行版。

### Q: 数据是否安全？
A: 所有数据都存储在本地 SQLite 数据库中，不会上传到任何服务器。

## 开发计划

- [ ] 支持数据库加密
- [ ] 添加数据统计和可视化
- [ ] 支持自定义字段
- [ ] 添加权限管理
- [ ] 支持云同步（可选）

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 Issue 或 Pull Request。

---

**注意：** 首次运行时，应用会自动创建数据库并初始化表结构。请确保有足够的磁盘空间。