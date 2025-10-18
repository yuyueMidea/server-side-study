**fastify 连接 supabase 数据库，实现用户管理的服务。**

整套可直接跑的 Fastify + Supabase(Postgres) 数据服务示例：包含连接配置、自动建表迁移、以及 users 表的增删改查接口与 curl 测试。示例使用 Node.js + pg 驱动直连 Supabase 的 Postgres（更贴近常规后端服务的用法）；

1、安装依赖：
`npm i fastify fastify-plugin pg dotenv`

2、目录：
```
project/
  user-admin.html
  .env
  fastify_supabase.js
  plugins/
    db.js
  routes/
    users.js
```

**1) 使用 fastify-plugin 暴露数据库连接（带自动建表/迁移）: plugins/db.js**

**2) 路由：users 增删改查（带参数校验与分页）: routes/users.js**

**3) 启动: node fastify_supabase.js**
