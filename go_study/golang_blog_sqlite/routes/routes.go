package routes

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"golang_blog/controllers"
	"golang_blog/middleware"
)

func RegisterRoutes(r *gin.Engine, db *gorm.DB) {
	r.GET("/health", controllers.Health)

	v1 := r.Group("/api/v1")
	{
		// auth
		auth := v1.Group("/auth")
		auth.POST("/register", controllers.Register(db))
		auth.POST("/login", controllers.Login(db))

		// profile
		v1.GET("/profile", middleware.AuthRequired(), controllers.Profile(db))

		// posts (public + protected)
		v1.GET("/posts", controllers.ListPosts(db))
		v1.GET("/posts/:id", controllers.GetPost(db))
		v1.POST("/posts", middleware.AuthRequired(), controllers.CreatePost(db))
		v1.PUT("/posts/:id", middleware.AuthRequired(), controllers.UpdatePost(db))
		v1.DELETE("/posts/:id", middleware.AuthRequired(), controllers.DeletePost(db))

		// comments (public)
		v1.GET("/comments/post/:post_id", controllers.ListCommentsByPost(db))

		// create comment under a post (protected)
		v1.POST("/posts/:post_id/comments", middleware.AuthRequired(), controllers.CreateComment(db))
	}
}
