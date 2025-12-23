package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/mattn/go-sqlite3"
)

// Post 文章结构体
type Post struct {
	ID        int       `json:"id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	ImagePath string    `json:"image_path"`
	ImageURL  string    `json:"image_url,omitempty"`
	ImageName string    `json:"image_name,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// Stats 统计信息
type Stats struct {
	TotalPosts  int `json:"total_posts"`
	TotalImages int `json:"total_images"`
}

var db *sql.DB

// 初始化数据库
func initDB() error {
	var err error
	db, err = sql.Open("sqlite3", "./data.db")
	if err != nil {
		return err
	}

	// 测试连接
	if err = db.Ping(); err != nil {
		return fmt.Errorf("数据库连接失败: %v", err)
	}

	// 创建表
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS posts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		content TEXT NOT NULL,
		image_path TEXT,
		image_name TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err = db.Exec(createTableSQL)
	if err != nil {
		return fmt.Errorf("创建表失败: %v", err)
	}

	log.Println("✅ 数据库初始化成功")
	return nil
}

// 创建上传目录
func createUploadDir() error {
	err := os.MkdirAll("./uploads", os.ModePerm)
	if err == nil {
		log.Println("✅ 上传目录创建成功")
	}
	return err
}

// 验证图片格式
func isValidImageType(filename string) bool {
	ext := filepath.Ext(filename)
	validExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
		".bmp":  true,
	}
	return validExts[ext]
}

// 创建文章
func createPost(c *gin.Context) {
	title := c.PostForm("title")
	content := c.PostForm("content")

	log.Printf("📝 创建文章请求: title=%s, content=%s", title, content)

	if title == "" || content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "标题和内容不能为空"})
		return
	}

	// 处理图片上传
	var imagePath, imageName string
	file, err := c.FormFile("image")
	if err == nil {
		log.Printf("🖼️  收到图片上传: %s, 大小: %d bytes", file.Filename, file.Size)

		// 验证图片格式
		if !isValidImageType(file.Filename) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "不支持的图片格式,请上传 jpg/png/gif/webp/bmp"})
			return
		}

		// 验证文件大小(限制5MB)
		if file.Size > 5*1024*1024 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "图片大小不能超过5MB"})
			return
		}

		// 生成唯一文件名
		ext := filepath.Ext(file.Filename)
		filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
		savePath := filepath.Join("uploads", filename)

		// 保存文件
		if err := c.SaveUploadedFile(file, savePath); err != nil {
			log.Printf("❌ 文件保存失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "文件保存失败"})
			return
		}
		imagePath = savePath
		imageName = file.Filename
		log.Printf("✅ 图片保存成功: %s", savePath)
	}

	// 插入数据库
	result, err := db.Exec(
		"INSERT INTO posts (title, content, image_path, image_name) VALUES (?, ?, ?, ?)",
		title, content, imagePath, imageName,
	)
	if err != nil {
		log.Printf("❌ 数据库插入失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库插入失败: " + err.Error()})
		return
	}

	id, _ := result.LastInsertId()
	log.Printf("✅ 文章创建成功, ID: %d", id)

	c.JSON(http.StatusCreated, gin.H{
		"message": "创建成功",
		"id":      id,
	})
}

// 获取所有文章(支持搜索和分页)
func getPosts(c *gin.Context) {
	search := c.Query("search")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "100"))

	log.Printf("📋 获取文章列表: search=%s, page=%d, pageSize=%d", search, page, pageSize)

	if page < 1 {
		page = 1
	}
	offset := (page - 1) * pageSize

	// 构建查询
	query := "SELECT id, title, content, image_path, image_name, created_at FROM posts"
	countQuery := "SELECT COUNT(*) FROM posts"

	// 为 count 查询准备参数
	var countArgs []interface{}
	// 为主查询准备参数
	var queryArgs []interface{}

	if search != "" {
		query += " WHERE title LIKE ? OR content LIKE ?"
		countQuery += " WHERE title LIKE ? OR content LIKE ?"
		searchPattern := "%" + search + "%"

		// count 查询的参数
		countArgs = []interface{}{searchPattern, searchPattern}
		// 主查询的参数(搜索条件)
		queryArgs = []interface{}{searchPattern, searchPattern}
	}

	// 获取总数
	var total int
	err := db.QueryRow(countQuery, countArgs...).Scan(&total)
	if err != nil {
		log.Printf("❌ 查询总数失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询总数失败: " + err.Error()})
		return
	}

	// 查询数据
	query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
	queryArgs = append(queryArgs, pageSize, offset)

	rows, err := db.Query(query, queryArgs...)
	if err != nil {
		log.Printf("❌ 查询数据失败: %v, query: %s", err, query)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询失败: " + err.Error()})
		return
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var post Post
		var imagePath, imageName sql.NullString
		err := rows.Scan(&post.ID, &post.Title, &post.Content, &imagePath, &imageName, &post.CreatedAt)
		if err != nil {
			log.Printf("❌ 扫描行失败: %v", err)
			continue
		}
		if imagePath.Valid && imagePath.String != "" {
			post.ImagePath = imagePath.String
			post.ImageName = imageName.String
			// 关键修复：只返回文件名，不包含 /api/ 前缀
			post.ImageURL = "/images/" + filepath.Base(imagePath.String)
		}
		posts = append(posts, post)
	}

	// 检查是否有行扫描错误
	if err = rows.Err(); err != nil {
		log.Printf("❌ 行迭代错误: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询错误: " + err.Error()})
		return
	}

	if posts == nil {
		posts = []Post{}
	}

	log.Printf("✅ 成功返回 %d 篇文章", len(posts))

	c.JSON(http.StatusOK, gin.H{
		"posts": posts,
		"total": total,
		"page":  page,
	})
}

// 获取单个文章
func getPost(c *gin.Context) {
	id := c.Param("id")
	log.Printf("📄 获取文章详情: id=%s", id)

	var post Post
	var imagePath, imageName sql.NullString
	err := db.QueryRow(
		"SELECT id, title, content, image_path, image_name, created_at FROM posts WHERE id = ?",
		id,
	).Scan(&post.ID, &post.Title, &post.Content, &imagePath, &imageName, &post.CreatedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "文章不存在"})
		return
	}
	if err != nil {
		log.Printf("❌ 查询失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询失败"})
		return
	}

	if imagePath.Valid && imagePath.String != "" {
		post.ImagePath = imagePath.String
		post.ImageName = imageName.String
		// 关键修复：只返回文件名，不包含 /api/ 前缀
		post.ImageURL = "/images/" + filepath.Base(imagePath.String)
	}

	c.JSON(http.StatusOK, post)
}

// 删除文章
func deletePost(c *gin.Context) {
	id := c.Param("id")
	log.Printf("🗑️  删除文章: id=%s", id)

	// 先查询图片路径
	var imagePath sql.NullString
	db.QueryRow("SELECT image_path FROM posts WHERE id = ?", id).Scan(&imagePath)

	// 删除数据库记录
	result, err := db.Exec("DELETE FROM posts WHERE id = ?", id)
	if err != nil {
		log.Printf("❌ 删除失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
		return
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "文章不存在"})
		return
	}

	// 删除图片文件
	if imagePath.Valid && imagePath.String != "" {
		if err := os.Remove(imagePath.String); err != nil {
			log.Printf("⚠️  删除图片文件失败: %v", err)
		} else {
			log.Printf("✅ 图片文件已删除: %s", imagePath.String)
		}
	}

	log.Printf("✅ 文章删除成功: id=%s", id)
	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

// 获取图片(支持下载)
func serveImage(c *gin.Context) {
	filename := c.Param("filename")
	filePath := filepath.Join("uploads", filename)

	log.Printf("🖼️  请求图片: %s", filename)

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		log.Printf("❌ 图片不存在: %s", filePath)
		c.JSON(http.StatusNotFound, gin.H{"error": "图片不存在"})
		return
	}

	// 检查是否是下载模式
	if c.Query("download") == "1" {
		c.Header("Content-Disposition", "attachment; filename="+filename)
		log.Printf("📥 下载模式: %s", filename)
	}

	c.File(filePath)
}

// 更新文章
func updatePost(c *gin.Context) {
	id := c.Param("id")
	title := c.PostForm("title")
	content := c.PostForm("content")

	log.Printf("✏️  更新文章: id=%s", id)

	if title == "" || content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "标题和内容不能为空"})
		return
	}

	// 检查是否有新图片上传
	file, err := c.FormFile("image")
	if err == nil {
		log.Printf("🖼️  更新图片: %s", file.Filename)

		// 验证图片
		if !isValidImageType(file.Filename) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "不支持的图片格式"})
			return
		}

		// 删除旧图片
		var oldPath sql.NullString
		db.QueryRow("SELECT image_path FROM posts WHERE id = ?", id).Scan(&oldPath)
		if oldPath.Valid && oldPath.String != "" {
			os.Remove(oldPath.String)
			log.Printf("🗑️  旧图片已删除: %s", oldPath.String)
		}

		// 保存新图片
		ext := filepath.Ext(file.Filename)
		filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
		savePath := filepath.Join("uploads", filename)
		if err := c.SaveUploadedFile(file, savePath); err != nil {
			log.Printf("❌ 文件保存失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "文件保存失败"})
			return
		}

		// 更新包含图片
		_, err = db.Exec(
			"UPDATE posts SET title = ?, content = ?, image_path = ?, image_name = ? WHERE id = ?",
			title, content, savePath, file.Filename, id,
		)
	} else {
		// 更新不包含图片
		_, err = db.Exec(
			"UPDATE posts SET title = ?, content = ? WHERE id = ?",
			title, content, id,
		)
	}

	if err != nil {
		log.Printf("❌ 更新失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新失败"})
		return
	}

	log.Printf("✅ 文章更新成功: id=%s", id)
	c.JSON(http.StatusOK, gin.H{"message": "更新成功"})
}

// 获取统计信息
func getStats(c *gin.Context) {
	var stats Stats

	// 获取文章总数
	err := db.QueryRow("SELECT COUNT(*) FROM posts").Scan(&stats.TotalPosts)
	if err != nil {
		log.Printf("❌ 获取文章总数失败: %v", err)
		stats.TotalPosts = 0
	}

	// 获取有图片的文章数
	err = db.QueryRow("SELECT COUNT(*) FROM posts WHERE image_path IS NOT NULL AND image_path != ''").Scan(&stats.TotalImages)
	if err != nil {
		log.Printf("❌ 获取图片总数失败: %v", err)
		stats.TotalImages = 0
	}

	log.Printf("📊 统计信息: 文章=%d, 图片=%d", stats.TotalPosts, stats.TotalImages)
	c.JSON(http.StatusOK, stats)
}

// 批量删除
func batchDelete(c *gin.Context) {
	var req struct {
		IDs []int `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}

	if len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请选择要删除的项目"})
		return
	}

	log.Printf("🗑️  批量删除: %d 篇文章", len(req.IDs))

	// 查询所有图片路径
	query := "SELECT image_path FROM posts WHERE id IN ("
	for i := range req.IDs {
		if i > 0 {
			query += ","
		}
		query += "?"
	}
	query += ")"

	args := make([]interface{}, len(req.IDs))
	for i, id := range req.IDs {
		args[i] = id
	}

	rows, _ := db.Query(query, args...)
	defer rows.Close()

	var imagePaths []string
	for rows.Next() {
		var path sql.NullString
		rows.Scan(&path)
		if path.Valid && path.String != "" {
			imagePaths = append(imagePaths, path.String)
		}
	}

	// 删除数据库记录
	deleteQuery := "DELETE FROM posts WHERE id IN ("
	for i := range req.IDs {
		if i > 0 {
			deleteQuery += ","
		}
		deleteQuery += "?"
	}
	deleteQuery += ")"

	_, err := db.Exec(deleteQuery, args...)
	if err != nil {
		log.Printf("❌ 批量删除失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
		return
	}

	// 删除图片文件
	for _, path := range imagePaths {
		os.Remove(path)
	}

	log.Printf("✅ 批量删除成功: %d 篇文章, %d 张图片", len(req.IDs), len(imagePaths))

	c.JSON(http.StatusOK, gin.H{
		"message": "批量删除成功",
		"count":   len(req.IDs),
	})
}

func main() {
	// 初始化数据库
	if err := initDB(); err != nil {
		log.Fatal("❌ 数据库初始化失败:", err)
	}
	defer db.Close()

	// 创建上传目录
	if err := createUploadDir(); err != nil {
		log.Fatal("❌ 创建上传目录失败:", err)
	}

	// 设置Gin为发布模式(可选)
	// gin.SetMode(gin.ReleaseMode)

	r := gin.Default()

	// 配置CORS(跨域资源共享)
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	r.Use(cors.New(config))

	// API路由
	api := r.Group("/api")
	{
		api.POST("/posts", createPost)               // 创建文章
		api.GET("/posts", getPosts)                  // 获取所有文章(支持搜索)
		api.GET("/posts/:id", getPost)               // 获取单个文章
		api.PUT("/posts/:id", updatePost)            // 更新文章
		api.DELETE("/posts/:id", deletePost)         // 删除文章
		api.POST("/posts/batch-delete", batchDelete) // 批量删除
		api.GET("/images/:filename", serveImage)     // 获取/下载图片
		api.GET("/stats", getStats)                  // 获取统计信息
	}

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"time":   time.Now(),
		})
	})

	log.Println("========================================")
	log.Println("🚀 服务器启动成功!")
	log.Println("📍 访问地址: http://localhost:8080")
	log.Println("📚 API文档:")
	log.Println("  POST   /api/posts              - 创建文章")
	log.Println("  GET    /api/posts              - 获取所有文章")
	log.Println("  GET    /api/posts/:id          - 获取单个文章")
	log.Println("  PUT    /api/posts/:id          - 更新文章")
	log.Println("  DELETE /api/posts/:id          - 删除文章")
	log.Println("  POST   /api/posts/batch-delete - 批量删除")
	log.Println("  GET    /api/images/:filename   - 获取图片")
	log.Println("  GET    /api/stats              - 统计信息")
	log.Println("========================================")

	r.Run(":8080")
}
