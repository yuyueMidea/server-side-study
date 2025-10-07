package main

import (
	"fmt"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Product struct {
	ID          uint
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   time.Time
	Name        string
	Price       float64
	Stock       int
	Category    string
	Description string
}

func main() {
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("hello, yy3, this is fiber example!")
	})
	// 2) 路由与参数（Path、Query、Body）
	app.Get("/hello/:name", func(c *fiber.Ctx) error {
		n := c.Params("name")
		fmt.Println("=== go fiber database example ===", n)
		return c.JSON(fiber.Map{
			"my name is ": n,
		})
	})
	// 初始化数据库
	db, err := gorm.Open(sqlite.Open("products.db"), &gorm.Config{})
	if err != nil {
		panic("fail to connect database!!")
	}
	// 自动迁移（创建/更新表结构）
	db.AutoMigrate(&Product{})
	// 获取所有产品
	app.Get("/products", func(c *fiber.Ctx) error {
		// 构建查询
		query := db.Model(&Product{})
		// 计算总数
		var total int64
		query.Count(&total)
		return c.JSON(fiber.Map{
			"total": total,
		})
	})
	log.Fatal(app.Listen(":8080"))
}
