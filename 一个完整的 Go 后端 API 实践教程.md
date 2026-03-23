下面搭建一个完整的 Go 后端 API 实践教程，从项目结构到代码实现逐步拆解。

---

## Go 后端服务 API 完整实现

我们将实现一个 **用户管理 REST API**，涵盖增删改查（CRUD）操作，使用 Go 标准库 + `gorilla/mux` 路由。

先看整体架构：---

## 第一步：初始化项目

```bash
mkdir go-user-api && cd go-user-api
go mod init github.com/yourname/go-user-api
go get github.com/gorilla/mux
```

---

## 第二步：定义数据模型 `models.go`

```go
package main

// User 是核心数据结构
// json 标签控制序列化时的字段名
type User struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

// 内存存储（生产环境换成数据库）
var (
    users  = make(map[int]User)
    nextID = 1
)
```

**解析：** `json:"id"` 是 struct tag，告诉 `encoding/json` 序列化时用小写字段名，符合 REST 规范。

---

## 第三步：编写中间件 `middleware.go`

```go
package main

import (
    "log"
    "net/http"
    "time"
)

// JSONMiddleware 为所有响应添加 Content-Type 头
func JSONMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        next.ServeHTTP(w, r)
    })
}

// LoggingMiddleware 记录每次请求的方法、路径、耗时
func LoggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        log.Printf("%s %s  [%v]", r.Method, r.URL.Path, time.Since(start))
    })
}
```

**解析：** 中间件是 `func(http.Handler) http.Handler` 的函数，通过"洋葱模型"层层包裹 handler，实现横切逻辑。

---

## 第四步：实现 Handler `handlers.go`

```go
package main

import (
    "encoding/json"
    "net/http"
    "strconv"

    "github.com/gorilla/mux"
)

// GetUsers  GET /users — 返回所有用户
func GetUsers(w http.ResponseWriter, r *http.Request) {
    list := make([]User, 0, len(users))
    for _, u := range users {
        list = append(list, u)
    }
    json.NewEncoder(w).Encode(list)
}

// GetUser  GET /users/{id} — 返回单个用户
func GetUser(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.Atoi(mux.Vars(r)["id"])
    u, ok := users[id]
    if !ok {
        http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
        return
    }
    json.NewEncoder(w).Encode(u)
}

// CreateUser  POST /users — 创建用户
func CreateUser(w http.ResponseWriter, r *http.Request) {
    var u User
    if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
        http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
        return
    }
    u.ID = nextID
    nextID++
    users[u.ID] = u
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(u)
}

// UpdateUser  PUT /users/{id} — 更新用户
func UpdateUser(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.Atoi(mux.Vars(r)["id"])
    if _, ok := users[id]; !ok {
        http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
        return
    }
    var u User
    json.NewDecoder(r.Body).Decode(&u)
    u.ID = id
    users[id] = u
    json.NewEncoder(w).Encode(u)
}

// DeleteUser  DELETE /users/{id} — 删除用户
func DeleteUser(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.Atoi(mux.Vars(r)["id"])
    if _, ok := users[id]; !ok {
        http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
        return
    }
    delete(users, id)
    w.WriteHeader(http.StatusNoContent)
}
```

**解析：**
- `json.NewDecoder(r.Body).Decode(&u)` — 流式解码，比 `ioutil.ReadAll` 更省内存
- `mux.Vars(r)["id"]` — 从 URL 路径提取动态参数
- 返回对应 HTTP 状态码（201 Created、204 No Content）是 REST 规范的关键

---

## 第五步：入口与路由注册 `main.go`

```go
package main

import (
    "log"
    "net/http"

    "github.com/gorilla/mux"
)

func main() {
    r := mux.NewRouter()

    // 应用中间件（链式包裹）
    r.Use(LoggingMiddleware)
    r.Use(JSONMiddleware)

    // 注册路由：HTTP 方法 + 路径 + Handler
    r.HandleFunc("/users",     GetUsers).Methods("GET")
    r.HandleFunc("/users",     CreateUser).Methods("POST")
    r.HandleFunc("/users/{id}", GetUser).Methods("GET")
    r.HandleFunc("/users/{id}", UpdateUser).Methods("PUT")
    r.HandleFunc("/users/{id}", DeleteUser).Methods("DELETE")

    log.Println("Server running on :8080")
    log.Fatal(http.ListenAndServe(":8080", r))
}
```

---

## 第六步：运行与测试

```bash
go run .
```

用 `curl` 测试各接口：

```bash
# 创建用户
curl -X POST http://localhost:8080/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com"}'

# 查询所有用户
curl http://localhost:8080/users

# 查询单个用户
curl http://localhost:8080/users/1

# 更新用户
curl -X PUT http://localhost:8080/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice Wang","email":"alice@new.com"}'

# 删除用户
curl -X DELETE http://localhost:8080/users/1
```

---

## 关键概念总结---

## 核心学习要点

**`http.Handler` 接口** 是 Go web 的基石，所有路由、中间件、handler 都实现这一个接口，组合非常灵活。

**中间件** 用闭包"包裹"下一个 handler，在调用 `next.ServeHTTP` 前后插入逻辑，无需框架支持即可实现日志、鉴权、限流。

**`encoding/json`** 的流式 Encoder/Decoder 直接操作 `io.Reader/Writer`，不需要先读到内存再解析，性能更好。

**状态码语义** 是 REST 的灵魂：`201 Created`（资源创建成功）、`204 No Content`（删除成功无返回体）、`404 Not Found`（资源不存在）要严格对应。

---
