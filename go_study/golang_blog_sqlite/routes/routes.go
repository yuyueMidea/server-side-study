package routes

import (
	"net/http"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"golang_blog/controllers"
	"golang_blog/middleware"
)

func webDirAbs() string {
	// routes/routes.go 的绝对路径 -> 项目根目录 -> /web
	_, f, _, ok := runtime.Caller(0)
	if !ok {
		panic("runtime.Caller failed")
	}
	root := filepath.Dir(filepath.Dir(f)) // routes/.. => 项目根目录
	return filepath.Join(root, "web")
}

func RegisterRoutes(r *gin.Engine, db *gorm.DB) {
	// 你原来的路由（保持不动）
	r.GET("/health", controllers.Health)

	v1 := r.Group("/api/v1")
	{
		auth := v1.Group("/auth")
		auth.POST("/register", controllers.Register(db))
		auth.POST("/login", controllers.Login(db))

		v1.GET("/profile", middleware.AuthRequired(), controllers.Profile(db))

		v1.GET("/posts", controllers.ListPosts(db))
		v1.GET("/posts/:id", controllers.GetPost(db))
		v1.POST("/posts", middleware.AuthRequired(), controllers.CreatePost(db))
		v1.PUT("/posts/:id", middleware.AuthRequired(), controllers.UpdatePost(db))
		v1.DELETE("/posts/:id", middleware.AuthRequired(), controllers.DeletePost(db))

		v1.GET("/comments/post/:post_id", controllers.ListCommentsByPost(db))
		v1.POST("/posts/:post_id/comments", middleware.AuthRequired(), controllers.CreateComment(db))
	}

	// ========== 关键：托管前端 ==========
	wd := webDirAbs()

	// 首页
	r.GET("/", func(c *gin.Context) {
		c.File(filepath.Join(wd, "index.html"))
	})

	// 你的 index.html 引用的是 ./styles.css 和 ./app.js（即 /styles.css、/app.js）
	r.StaticFile("/styles.css", filepath.Join(wd, "styles.css"))
	r.StaticFile("/app.js", filepath.Join(wd, "app.js"))

	// （可选）如果将来有图片/资源目录：
	// r.Static("/assets", filepath.Join(wd, "assets"))

	// （可选）SPA fallback：避免刷新子路径 404（但不要吞掉 /api 和 /health）
	r.NoRoute(func(c *gin.Context) {
		p := c.Request.URL.Path
		if strings.HasPrefix(p, "/api/") || p == "/health" || strings.HasPrefix(p, "/assets/") {
			c.AbortWithStatus(http.StatusNotFound)
			return
		}
		c.File(filepath.Join(wd, "index.html"))
	})
}
