**fastify-sqlite-users**

可直接运行的 Fastify + 本地 SQLite 用户管理服务，包含：表结构初始化、增删查改接口、字段校验、错误处理、软/硬删除、分页搜索，以及完整的 curl 测试命令。拷贝代码、npm install 后就能跑。

安装并运行
- npm install
- node app.js

接口说明
| 方法     | 路径           | 说明      | 备注                                                             |
| ------ | ------------ | ------- | -------------------------------------------------------------- |
| GET    | `/health`    | 健康检查    | 返回 `{ ok: true }`                                              |
| POST   | `/users`     | 创建用户    | `name`(必), `email`(必, 唯一), `age`(可空)                           |
| GET    | `/users`     | 列表查询    | `q`(搜索 name/email), `limit`(1~100), `offset`, `includeDeleted` |
| GET    | `/users/:id` | 按 ID 查询 | `includeDeleted`(是否包含软删)                                       |
| PUT    | `/users/:id` | 全量更新    | 覆盖 `name/email/age`                                            |
| PATCH  | `/users/:id` | 局部更新    | 修改任意字段                                                         |
| DELETE | `/users/:id` | 删除      | 默认软删；`?hard=true` 硬删/物理删除                                      |
