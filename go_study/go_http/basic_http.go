package main

import (
	"fmt"
	"log"
	"net/http"
)

// 处理器函数 - 处理HTTP请求
func helloHandler(w http.ResponseWriter, r *http.Request) {
	// w: ResponseWriter - 用于写入响应
	// r: Request - 包含请求信息
	fmt.Fprintf(w, "hello, world, this is your first Go http server")
}

func main() {
	fmt.Println("===go http server===")
	// 注册路由和处理器// "/" 表示根路径
	http.HandleFunc("/", helloHandler)
	// 启动服务器，监听8080端口
	fmt.Println("服务器启动在: http://localhost:8080")
	// 如果启动失败，log.Fatal会打印错误并退出程序
	log.Fatal(http.ListenAndServe(":8080", nil))
}
