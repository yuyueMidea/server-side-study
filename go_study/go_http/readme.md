gin basic routine

关键知识点：
- gin.Default() vs gin.New()：Default 包含日志和错误恢复中间件
- gin.H：是 map[string]interface{} 的简写，用于快速构建 JSON
- 参数绑定：binding:"required" 标签会自动验证，类似前端的表单验证
