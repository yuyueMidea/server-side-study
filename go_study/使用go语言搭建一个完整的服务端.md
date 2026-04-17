下面是使用 **Go 语言（Golang）+ SQLite（本地数据库）+ 标准库 net/http** 快速实现的一个完整的**增删查改（CRUD）服务端项目**示例，**无框架依赖**，适合快速上手。

---

## ✅ 项目目标

实现对用户数据（id、name、age）的：

* 新增（Create）
* 查询（Read）
* 更新（Update）
* 删除（Delete）

使用：

* 本地数据库：SQLite
* 语言/框架：Go + net/http + database/sql + SQLite 驱动

---

## 📁 目录结构

```
go_crud_sqlite/
├── main.go         // 主入口
├── database.db     // 本地数据库（程序运行后自动生成）
```

---

## 🔧 第一步：安装 SQLite 驱动

```bash
go get github.com/mattn/go-sqlite3
```

---

## 🧠 第二步：完整服务端代码（main.go）

```go
package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	_ "github.com/mattn/go-sqlite3"
)

type User struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Age  int    `json:"age"`
}

var db *sql.DB

func initDB() {
	var err error
	db, err = sql.Open("sqlite3", "./database.db")
	if err != nil {
		log.Fatal(err)
	}

	// 初始化表
	sqlStmt := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		age INTEGER NOT NULL
	);
	`
	_, err = db.Exec(sqlStmt)
	if err != nil {
		log.Fatal("Create table failed:", err)
	}
}

// 添加用户
func createUser(w http.ResponseWriter, r *http.Request) {
	var user User
	json.NewDecoder(r.Body).Decode(&user)

	stmt, _ := db.Prepare("INSERT INTO users(name, age) VALUES (?, ?)")
	res, err := stmt.Exec(user.Name, user.Age)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	id, _ := res.LastInsertId()
	user.ID = int(id)
	json.NewEncoder(w).Encode(user)
}

// 获取所有用户
func getUsers(w http.ResponseWriter, r *http.Request) {
	rows, _ := db.Query("SELECT id, name, age FROM users")
	defer rows.Close()

	var users []User
	for rows.Next() {
		var user User
		rows.Scan(&user.ID, &user.Name, &user.Age)
		users = append(users, user)
	}
	json.NewEncoder(w).Encode(users)
}

// 更新用户
func updateUser(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, _ := strconv.Atoi(idStr)

	var user User
	json.NewDecoder(r.Body).Decode(&user)

	stmt, _ := db.Prepare("UPDATE users SET name=?, age=? WHERE id=?")
	_, err := stmt.Exec(user.Name, user.Age, id)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	user.ID = id
	json.NewEncoder(w).Encode(user)
}

// 删除用户
func deleteUser(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, _ := strconv.Atoi(idStr)

	stmt, _ := db.Prepare("DELETE FROM users WHERE id=?")
	_, err := stmt.Exec(id)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	w.Write([]byte("Deleted successfully"))
}

func main() {
	initDB()

	http.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.Method {
		case http.MethodGet:
			getUsers(w, r)
		case http.MethodPost:
			createUser(w, r)
		case http.MethodPut:
			updateUser(w, r)
		case http.MethodDelete:
			deleteUser(w, r)
		default:
			http.Error(w, "Method Not Allowed", 405)
		}
	})

	log.Println("Server running on http://localhost:8080")
	http.ListenAndServe(":8080", nil)
}
```

---

## 🚀 第三步：运行服务

```bash
go run main.go
```

运行后：

* 数据库文件 `database.db` 会自动创建
* 服务监听 `http://localhost:8080`

---

## 📬 API 示例

### 1. 创建用户（POST）

```bash
curl -X POST http://localhost:8080/users -H "Content-Type: application/json" -d '{"name":"Alice","age":25}'
```

### 2. 获取用户列表（GET）

```bash
curl http://localhost:8080/users
```

### 3. 更新用户（PUT）

```bash
curl -X PUT "http://localhost:8080/users?id=1" -H "Content-Type: application/json" -d '{"name":"Bob","age":30}'
```

### 4. 删除用户（DELETE）

```bash
curl -X DELETE "http://localhost:8080/users?id=1"
```

---

## ✅ 总结

| 项目要素 | 实现                            |
| ---- | ----------------------------- |
| 数据存储 | SQLite 本地文件                   |
| 接口风格 | RESTful API                   |
| 启动方式 | `go run main.go`              |
| 构建依赖 | `github.com/mattn/go-sqlite3` |

---
