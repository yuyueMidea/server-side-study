package main

import (
	"fmt"
	"log"
	"strconv"
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
		var products []Product
		query.Count(&total)
		// 解析查询参数
		pagesizestr := c.Query("page_size", "10")
		pagesize, err := strconv.Atoi(pagesizestr)
		if err != nil || pagesize < 1 {
			pagesize = 10
		}
		fmt.Println("pagesizeee: ", pagesize)

		query.Limit(pagesize).Find(&products)
		return c.JSON(fiber.Map{
			"total": total,
			"data":  products,
		})
	})
	app.Get("/products/:category", func(c *fiber.Ctx) error {
		// 按分类获取产品
		var products []Product
		category := c.Params("category")
		db.Where("category = ?", category).Find(&products)
		return c.JSON(fiber.Map{
			"count": len(products),
			"data":  products,
		})
	})
	// 获取单个产品
	app.Get("/products/:id", func(c *fiber.Ctx) error {
		var product Product
		id := c.Params("id")
		fmt.Println("====product_id: ", id)
		err := db.First(&product, id).Error
		if err != nil {
			return c.JSON(fiber.Map{
				"error": "product not found",
			})
		}
		return c.JSON(fiber.Map{
			"success": true,
			"data":    product,
		})
	})
	log.Fatal(app.Listen(":8080"))
}
