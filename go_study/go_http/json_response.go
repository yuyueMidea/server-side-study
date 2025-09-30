package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

type User struct {
	ID    int
	Name  string
	Email string
	Age   int
}

// 返回用户列表
func userHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	//user_list
	userList := []User{
		{ID: 1, Name: "zhangfsan", Email: "zhangsn@163.com", Age: 33},
		{ID: 2, Name: "lisi", Email: "lisi@163.com", Age: 44},
		{ID: 3, Name: "wangwu", Email: "wangwu@163.com", Age: 35},
		{ID: 4, Name: "admin", Email: "admin@163.com", Age: 56},
	}
	// 方式1: 使用Encoder返回
	json.NewEncoder(w).Encode(userList)
}

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "welcome to Go http server,  current time is: %v", time.Now())
	})
	http.HandleFunc("/users", userHandler)
	fmt.Println("==== go http json response, localhost:8080====")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
