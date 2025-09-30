package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type User struct {
	ID   int
	Name string
}

// 模拟用户数据库
var userlist = map[int]User{
	1: {ID: 1, Name: "张三"},
	2: {ID: 2, Name: "李四"},
	3: {ID: 3, Name: "王五"},
	4: {ID: 4, Name: "q1"},
	5: {ID: 5, Name: "w2"},
	6: {ID: 6, Name: "e3"},
	7: {ID: 7, Name: "r4"},
}

// 获取用户列表的接口
func userListHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(userlist)
}

// 处理路径参数: /user/123
func userByIDhandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	// 从URL中提取ID
	// 例如: /user/123 -> 提取 "123"
	path := r.URL.Path
	parts := strings.Split(path, "/")
	idstr := parts[2]
	id, err := strconv.Atoi(idstr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	user, exist := userlist[id]
	if !exist {
		http.Error(w, "user does not exist!", http.StatusBadRequest)
		return
	}
	fmt.Println("path: ", path, ", parts: ", parts, " len: ", len(parts), ", user: ", user)
	json.NewEncoder(w).Encode(user)

}
func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "welcome, the current time is %v", time.Now())
	})
	http.HandleFunc("/users", userListHandler)
	http.HandleFunc("/user/", userByIDhandler)
	fmt.Println("=== go http server url parameter, localhost:8080 ==")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
