一个基于 Go (Gin) 的完整后端服务，实现 user 表的增删查改功能，并连接到自己个人的 Supabase 数据库。

🎯 主要特性

完整的 CRUD 功能
- ✅ 获取所有用户（GET /api/users）
- ✅ 获取单个用户（GET /api/users/:id）
- ✅ 创建用户（POST /api/users）
- ✅ 更新用户（PUT /api/users/:id）
- ✅ 删除用户（DELETE /api/users/:id）


开箱即用
- 已配置好你的 Supabase 连接信息
- 包含完整的错误处理
- 数据验证（email 格式验证、必填字段）
- CORS 跨域支持


生产就绪
- 支持环境变量配置
- 健康检查端点
- Docker 部署支持
- 完整的测试脚本
