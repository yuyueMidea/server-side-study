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

测试命令（curl）
```
# 1) 健康检查
curl -s http://127.0.0.1:3000/health

# 2) 创建用户
curl -i -X POST http://127.0.0.1:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","age":25}'

# 3) 再创建一个用户
curl -i -X POST http://127.0.0.1:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Bob","email":"bob@example.com","age":30}'

# 4) 列表查询（分页）
curl -s "http://127.0.0.1:3000/users?limit=10&offset=0"

# 5) 关键词搜索（按 name/email 模糊）
curl -s "http://127.0.0.1:3000/users?q=ali"

# 6) 按 ID 查询
curl -s http://127.0.0.1:3000/users/1

# 7) 全量更新（PUT）
curl -s -X PUT http://127.0.0.1:3000/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice Zhang","email":"alice@example.com","age":26}'

# 8) 局部更新（PATCH）
curl -s -X PATCH http://127.0.0.1:3000/users/2 \
  -H "Content-Type: application/json" \
  -d '{"age":31}'

# 9) 软删除
curl -i -X DELETE http://127.0.0.1:3000/users/2

# 10) 软删后的查询（默认查不到）
curl -i http://127.0.0.1:3000/users/2

# 11) 查看包含软删的数据
curl -s "http://127.0.0.1:3000/users?includeDeleted=true"

# 12) 硬删除（物理删除）
curl -i -X DELETE "http://127.0.0.1:3000/users/2?hard=true"
```
