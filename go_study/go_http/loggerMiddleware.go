package main

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// 日志中间件
func LoggerMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		start := time.Now()
		// 执行请求
		ctx.Next()
		// 请求后处理
		latency := time.Since(start)
		status := ctx.Writer.Status()
		println("[GIN]: ", ctx.Request.Method, ctx.Request.URL.Path, status, latency)
	}
}

func main() {
	r := gin.New()            // 不使用默认中间件
	r.Use(LoggerMiddleware()) //引入日志中间件
	r.GET("/", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{"data": "hello, ok"})
	})
	r.GET("/:name", func(ctx *gin.Context) {
		cname := ctx.Param("name")
		ctx.JSON(http.StatusOK, gin.H{"data": "hello: " + cname})
	})

	r.Run(":8080")
}
