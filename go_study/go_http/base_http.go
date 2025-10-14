package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
)

type User struct {
	ID    int
	Name  string
	Email string
}
type Todo struct {
	ID       int
	Title    string
	Complete bool
}

// 全局数据存储
var (
	todos   = make(map[int]Todo)
	nextID  = 1
	todosMu sync.RWMutex
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "hello, yy3")
	})
	http.HandleFunc("/about", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "about page")
	})
	http.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {
		userlist := []User{
			{ID: 1, Name: "zhangsna", Email: "zhangsan@163.com"},
			{ID: 2, Name: "lisi", Email: "lisi@163.com"},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(userlist)
	})
	//get-todos
	http.HandleFunc("/todos", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.Method {
		case "GET":
			// 获取所有todos
			todosMu.RLock()
			list := make([]Todo, 0, len(todos))
			for _, todo := range todos {
				list = append(list, todo)
			}
			todosMu.RUnlock()
			json.NewEncoder(w).Encode(list)
		case "POST":
			// 创建新todo
			var todo Todo
			err := json.NewDecoder(r.Body).Decode(&todo)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			if todo.Title == "" {
				http.Error(w, "title is required!", http.StatusBadRequest)
				return
			}
			todosMu.Lock()
			todo.ID = nextID
			todos[nextID] = todo
			nextID++
			todosMu.Unlock()
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(todo)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	//add new todo
	http.HandleFunc("/todos/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		// 从URL提取ID
		idstr := strings.TrimPrefix(r.URL.Path, "/todos/")
		id, err := strconv.Atoi(idstr)
		if err != nil {
			http.Error(w, "Invalid ID", http.StatusBadRequest)
			return
		}
		switch r.Method {
		case "GET":
			// 获取单个todo
			todosMu.RLock()
			todo, exists := todos[id]
			todosMu.RUnlock()
			if !exists {
				http.Error(w, "Todo not found", http.StatusNotFound)
				return
			}
			json.NewEncoder(w).Encode(todo)
		case "PUT":
			// 更新todo
			todosMu.Lock()
			_, exists := todos[id]
			if !exists {
				http.Error(w, "Todo not found", http.StatusNotFound)
				return
			}
			var todo Todo
			err := json.NewDecoder(r.Body).Decode(&todo)
			if err != nil {
				todosMu.Unlock()
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			todo.ID = id
			todos[id] = todo
			todosMu.Unlock()
			json.NewEncoder(w).Encode(todo)
		case "DELETE":
			// 删除todo
			todosMu.Lock()
			_, exists := todos[id]
			if !exists {
				todosMu.Unlock()
				http.Error(w, "Todo not found", http.StatusNotFound)
				return
			}
			delete(todos, id)
			w.WriteHeader(http.StatusNoContent)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}

	})

	fmt.Println("Server starting on :8080")
	fmt.Println("GET    /todos      - Get all todos")
	fmt.Println("POST   /todos      - Create todo")
	fmt.Println("GET    /todos/:id  - Get todo by ID")
	fmt.Println("PUT    /todos/:id  - Update todo")
	fmt.Println("DELETE /todos/:id  - Delete todo")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

//测试脚本：
//curl -i -X POST http://localhost:8080/todos -H "Content-Type: application/json" -d "{\"title\":\"learn Go web\",\"complete\":false}"
//curl -i -X DELETE http://localhost:8080/todos/2
//curl -i http://localhost:8080/todos/1
//curl -i http://localhost:8080/todos

