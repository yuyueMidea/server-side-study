package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func main() {
	println("==== route_Groups ====")
	// ===== 5. 路由分组 =====
	r := gin.Default()
	// API v1 路由组
	v1 := r.Group("/api/v1/")

	// 用户相关
	users := v1.Group("/users")
	{
		users.GET("/", func(ctx *gin.Context) {
			ctx.JSON(http.StatusOK, gin.H{"data": "get all userlist"})
		})
		users.GET("/:id", func(ctx *gin.Context) {
			id := ctx.Param("id")
			ctx.JSON(http.StatusOK, gin.H{"data": "get user by id" + id})
		})
	}

	// 产品相关
	prod := v1.Group("/products")
	{
		prod.GET("/", func(ctx *gin.Context) {
			ctx.JSON(http.StatusOK, gin.H{"data": "get all products list"})
		})
	}

	// API v2 路由组
	v2 := r.Group("/api/v2")
	{
		v2.GET("/info", func(ctx *gin.Context) {
			ctx.JSON(http.StatusOK, gin.H{"data": "version 2.0"})
		})
	}

	r.Run(":8080")
}
