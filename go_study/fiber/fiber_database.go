package main

import (
	"fmt"
	"log"

	"github.com/gofiber/fiber/v2"
)

func main() {
	fmt.Println("======go fiber database======")
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("hello, go fiber!")
	})
	// 2) 路由与参数（Path、Query、Body）
	app.Get("/hello/:name", func(c *fiber.Ctx) error {
		name := c.Params("name")
		lang := c.Query("lang", "zh-CN")
		fmt.Println("nnn: ", name)
		return c.JSON(fiber.Map{
			"msg":  "hi, my name is " + name,
			"lang": lang,
		})
	})
	log.Fatal(app.Listen(":8080"))
}
