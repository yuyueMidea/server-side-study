package main

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

func main() {
	fname := "userIndex.html"
	wd, _ := os.Getwd()
	abs := filepath.Join(wd, fname)
	_, err := os.Stat(abs)
	if err != nil {
		println("[frontend] 未找到文件：", abs)
		return
	}
	// 2) 启动静态文件服务器（服务整个工作目录）
	fs := http.FileServer(http.Dir(wd))
	fmt.Println("=== auto open file===", fname, "wd: ", wd)
	srv := &http.Server{Addr: ":5173", Handler: fs}
	println("[frontend] 静态服务器已启动： http://localhost:5173" + "/" + fname)
	// srv.ListenAndServe() 放在主 goroutine 里同步调用了，它是阻塞的。只有当服务器退出或报错时才会返回
	// 直接把 ListenAndServe 丢进 goroutine，然后再开浏览器；主函数用信号阻塞住即可：
	go func() {
		err = srv.ListenAndServe()
		if err != nil {
			println("[frontend] 静态服务器启动失败：", err.Error())
		}
	}()
	// 打开默认浏览器
	time.Sleep(3000 * time.Millisecond)
	exec.Command("cmd", "/c", "start", "http://localhost:5173"+"/"+fname).Start()
}
