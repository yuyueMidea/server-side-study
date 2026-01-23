# 墨迹博客系统 (Fastify Blog System)

一个使用 **React + Fastify + SQLite** 构建的全栈个人博客系统。

![Tech Stack](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)
![Tech Stack](https://img.shields.io/badge/Fastify-4.x-000000?logo=fastify)
![Tech Stack](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)
![Tech Stack](https://img.shields.io/badge/Tailwind-3.x-38B2AC?logo=tailwindcss)

## ✨ 功能特性

### 用户功能
- 📝 用户注册与登录（JWT认证）
- 👤 个人资料管理
- 🔐 密码加密存储（bcrypt）

### 文章功能
- 📖 浏览所有文章（分页）
- ✍️ 创建、编辑、删除文章（仅作者）
- 📊 文章统计（字数、评论数）

### 评论功能
- 💬 查看文章评论
- 📨 发表评论（需登录）
- 🗑️ 删除自己的评论

### 技术亮点
- 🎨 精美的中式文艺风格UI设计
- 📱 完全响应式，适配各种设备
- ⚡ 单命令启动前后端
- 🔄 热重载开发体验
- 🛡️ JWT 身份验证
- 📦 统一的 package.json 管理

## 📁 项目结构

```
fastify-blog-system/
├── backend/                    # 后端代码
│   ├── cmd/
│   │   └── main.js            # 程序入口
│   ├── config/
│   │   └── database.js        # 数据库配置
│   ├── controllers/
│   │   ├── auth.js            # 认证控制器
│   │   ├── post.js            # 文章控制器
│   │   └── comment.js         # 评论控制器
│   ├── middleware/
│   │   ├── auth.js            # JWT认证中间件
│   │   └── logger.js          # 日志中间件
│   ├── models/
│   │   ├── user.js            # 用户模型
│   │   ├── post.js            # 文章模型
│   │   └── comment.js         # 评论模型
│   ├── routes/
│   │   └── routes.js          # 路由配置
│   ├── utils/
│   │   ├── jwt.js             # JWT工具
│   │   └── response.js        # 响应工具
│   └── data/                  # SQLite数据库文件
│
├── src/                       # 前端代码
│   ├── components/            # React组件
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── PostCard.jsx
│   │   ├── Comment.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── UI.jsx
│   ├── pages/                 # 页面组件
│   │   ├── HomePage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── PostDetailPage.jsx
│   │   ├── WritePostPage.jsx
│   │   ├── ProfilePage.jsx
│   │   └── NotFoundPage.jsx
│   ├── context/
│   │   └── AuthContext.jsx    # 认证上下文
│   ├── hooks/
│   │   └── usePosts.js        # 自定义Hooks
│   ├── utils/
│   │   ├── api.js             # API请求封装
│   │   └── helpers.js         # 工具函数
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## 🚀 快速开始

### 环境要求
- Node.js >= 18.x
- npm >= 9.x

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

这将同时启动：
- 前端开发服务器: http://localhost:5173
- 后端API服务器: http://localhost:3000

### 单独启动

```bash
# 仅启动前端
npm run dev:frontend

# 仅启动后端
npm run dev:backend
```

### 生产构建

```bash
npm run build
```

## 📡 API 文档

### 基础路径
所有API请求的基础路径: `/api/v1`

### 认证接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/auth/register` | 用户注册 | ❌ |
| POST | `/auth/login` | 用户登录 | ❌ |
| GET | `/profile` | 获取当前用户信息 | ✅ |

### 文章接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/posts` | 获取文章列表（分页） | ❌ |
| GET | `/posts/:id` | 获取文章详情 | ❌ |
| POST | `/posts` | 创建文章 | ✅ |
| PUT | `/posts/:id` | 更新文章 | ✅ (作者) |
| DELETE | `/posts/:id` | 删除文章 | ✅ (作者) |

### 评论接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/comments/post/:post_id` | 获取文章评论 | ❌ |
| POST | `/posts/:post_id/comments` | 创建评论 | ✅ |
| DELETE | `/comments/:id` | 删除评论 | ✅ (作者) |

### 健康检查

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/health` | 服务健康检查 |

### 请求/响应示例

#### 注册用户
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

响应：
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### 获取文章列表
```bash
GET /api/v1/posts?page=1&limit=10
```

响应：
```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": 1,
      "title": "文章标题",
      "content": "文章内容...",
      "user_id": 1,
      "created_at": "2024-01-01T00:00:00.000Z",
      "author": {
        "id": 1,
        "username": "testuser"
      },
      "comment_count": 5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  }
}
```

## 🗄️ 数据库设计

### Users 表
| 字段 | 类型 | 描述 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| username | TEXT | 用户名，唯一 |
| email | TEXT | 邮箱，唯一 |
| password | TEXT | 加密密码 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |
| deleted_at | DATETIME | 软删除时间 |

### Posts 表
| 字段 | 类型 | 描述 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| title | TEXT | 文章标题 |
| content | TEXT | 文章内容 |
| user_id | INTEGER | 作者ID（外键） |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |
| deleted_at | DATETIME | 软删除时间 |

### Comments 表
| 字段 | 类型 | 描述 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| content | TEXT | 评论内容 |
| user_id | INTEGER | 评论者ID（外键） |
| post_id | INTEGER | 文章ID（外键） |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |
| deleted_at | DATETIME | 软删除时间 |

## 🔧 配置说明

### 环境变量

创建 `.env` 文件（可选）：

```env
# 服务器配置
PORT=3000
HOST=0.0.0.0

# JWT配置
JWT_SECRET=your-super-secret-key-change-in-production
```

### 跨域配置

后端默认允许以下来源：
- `http://localhost:5173` (Vite开发服务器)
- `http://localhost:3000` (后端服务)

如需修改，编辑 `backend/cmd/main.js` 中的 CORS 配置。

## 🛠️ 技术栈

### 前端
- **React 18** - UI框架
- **React Router 6** - 路由管理
- **Tailwind CSS 3** - 样式框架
- **Vite 5** - 构建工具

### 后端
- **Fastify 4** - Web框架
- **better-sqlite3** - SQLite数据库驱动
- **@fastify/jwt** - JWT认证
- **@fastify/cors** - 跨域支持
- **bcryptjs** - 密码加密

## 📝 开发指南

### 添加新的API端点

1. 在 `backend/models/` 中定义数据模型
2. 在 `backend/controllers/` 中实现控制器
3. 在 `backend/routes/routes.js` 中注册路由

### 添加新的前端页面

1. 在 `src/pages/` 中创建页面组件
2. 在 `src/App.jsx` 中添加路由

### 自定义样式

编辑 `tailwind.config.js` 来自定义：
- 颜色主题
- 字体系列
- 动画效果

## 📄 许可证

MIT License

---

**Made with ❤️ using React + Fastify + SQLite**
