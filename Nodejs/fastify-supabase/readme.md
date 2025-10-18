**fastify 连接 supabase 数据库，实现用户管理的服务。**

整套可直接跑的 Fastify + Supabase(Postgres) 数据服务示例：包含连接配置、自动建表迁移、以及 users 表的增删改查接口与 curl 测试。示例使用 Node.js + pg 驱动直连 Supabase 的 Postgres（更贴近常规后端服务的用法）；

1、安装依赖：
`npm i fastify fastify-plugin pg dotenv`
