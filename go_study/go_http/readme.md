gin basic routine

路由基础关键知识点：
- gin.Default() vs gin.New()：Default 包含日志和错误恢复中间件
- gin.H：是 map[string]interface{} 的简写，用于快速构建 JSON
- 参数绑定：binding:"required" 标签会自动验证，类似前端的表单验证

路由分组与中间件关键知识点：
- c.Next()：控制中间件执行流程，类似 Express 的 next()
- c.Abort()：停止执行后续中间件和处理函数
- c.Set() / c.Get()：在请求上下文中存储和读取数据
- 路由分组：使用花括号 {} 只是为了代码可读性，不是必须的
