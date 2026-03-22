一个**更接近“可落地项目”的 Go / Java REST API 对照实现**。

选这组技术栈来对照：

* **Go**：`chi + database/sql + PostgreSQL`
* **Java**：`Spring Boot + Spring Web + Spring Data JPA + PostgreSQL`

场景统一为一个 **User REST API**，包含：

* `POST /users`
* `GET /users/{id}`
* `GET /users`
* `PUT /users/{id}`
* `DELETE /users/{id}`

同时补上这些在“完整实现”里通常不能少的部分：

* 分层结构
* DTO / 参数校验
* 错误处理
* 分页
* 数据库访问
* 路由
* 启动入口
* 建表 SQL
* 对照分析

---

# 一、项目结构对照

## Go 版本

```text
go-rest-api/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── handler/
│   │   └── user_handler.go
│   ├── model/
│   │   └── user.go
│   ├── repository/
│   │   └── user_repository.go
│   ├── service/
│   │   └── user_service.go
│   ├── dto/
│   │   └── user_dto.go
│   └── app/
│       └── router.go
├── pkg/
│   └── response/
│       └── json.go
├── migrations/
│   └── 001_create_users.sql
├── go.mod
└── .env
```

## Java 版本

```text
java-rest-api/
├── src/main/java/com/example/demo/
│   ├── controller/
│   │   └── UserController.java
│   ├── service/
│   │   └── UserService.java
│   ├── repository/
│   │   └── UserRepository.java
│   ├── entity/
│   │   └── User.java
│   ├── dto/
│   │   ├── CreateUserRequest.java
│   │   ├── UpdateUserRequest.java
│   │   └── UserResponse.java
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java
│   │   └── NotFoundException.java
│   └── DemoApplication.java
├── src/main/resources/
│   ├── application.yml
│   └── schema.sql
└── pom.xml
```

---

# 二、数据库表

## PostgreSQL SQL

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    age INT NOT NULL CHECK (age >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

# 三、Go 完整实现

---

## 1）model

### `internal/model/user.go`

```go
package model

import "time"

type User struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Age       int       `json:"age"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
```

---

## 2）DTO

### `internal/dto/user_dto.go`

```go
package dto

type CreateUserRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Age   int    `json:"age"`
}

type UpdateUserRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Age   int    `json:"age"`
}
```

---

## 3）统一响应

### `pkg/response/json.go`

```go
package response

import (
	"encoding/json"
	"net/http"
)

func JSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, map[string]any{
		"error": message,
	})
}
```

---

## 4）repository

### `internal/repository/user_repository.go`

```go
package repository

import (
	"context"
	"database/sql"
	"errors"

	"go-rest-api/internal/model"
)

type UserRepository struct {
	DB *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{DB: db}
}

func (r *UserRepository) Create(ctx context.Context, user *model.User) error {
	query := `
		INSERT INTO users (name, email, age)
		VALUES ($1, $2, $3)
		RETURNING id, created_at, updated_at
	`
	return r.DB.QueryRowContext(ctx, query, user.Name, user.Email, user.Age).
		Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
}

func (r *UserRepository) GetByID(ctx context.Context, id int64) (*model.User, error) {
	query := `
		SELECT id, name, email, age, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	var u model.User
	err := r.DB.QueryRowContext(ctx, query, id).
		Scan(&u.ID, &u.Name, &u.Email, &u.Age, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) List(ctx context.Context, limit, offset int) ([]model.User, error) {
	query := `
		SELECT id, name, email, age, created_at, updated_at
		FROM users
		ORDER BY id
		LIMIT $1 OFFSET $2
	`
	rows, err := r.DB.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []model.User
	for rows.Next() {
		var u model.User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Age, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (r *UserRepository) Update(ctx context.Context, user *model.User) error {
	query := `
		UPDATE users
		SET name = $1, email = $2, age = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $4
		RETURNING updated_at
	`
	return r.DB.QueryRowContext(ctx, query, user.Name, user.Email, user.Age, user.ID).
		Scan(&user.UpdatedAt)
}

func (r *UserRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM users WHERE id = $1`
	_, err := r.DB.ExecContext(ctx, query, id)
	return err
}
```

---

## 5）service

### `internal/service/user_service.go`

```go
package service

import (
	"context"
	"errors"
	"strings"

	"go-rest-api/internal/dto"
	"go-rest-api/internal/model"
	"go-rest-api/internal/repository"
)

var (
	ErrInvalidInput = errors.New("invalid input")
	ErrUserNotFound = errors.New("user not found")
)

type UserService struct {
	Repo *repository.UserRepository
}

func NewUserService(repo *repository.UserRepository) *UserService {
	return &UserService{Repo: repo}
}

func (s *UserService) Create(ctx context.Context, req dto.CreateUserRequest) (*model.User, error) {
	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Email) == "" || req.Age < 0 {
		return nil, ErrInvalidInput
	}

	user := &model.User{
		Name:  req.Name,
		Email: req.Email,
		Age:   req.Age,
	}
	if err := s.Repo.Create(ctx, user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *UserService) GetByID(ctx context.Context, id int64) (*model.User, error) {
	user, err := s.Repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}
	return user, nil
}

func (s *UserService) List(ctx context.Context, limit, offset int) ([]model.User, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}
	return s.Repo.List(ctx, limit, offset)
}

func (s *UserService) Update(ctx context.Context, id int64, req dto.UpdateUserRequest) (*model.User, error) {
	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Email) == "" || req.Age < 0 {
		return nil, ErrInvalidInput
	}

	user, err := s.Repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}

	user.Name = req.Name
	user.Email = req.Email
	user.Age = req.Age

	if err := s.Repo.Update(ctx, user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *UserService) Delete(ctx context.Context, id int64) error {
	user, err := s.Repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if user == nil {
		return ErrUserNotFound
	}
	return s.Repo.Delete(ctx, id)
}
```

---

## 6）handler

### `internal/handler/user_handler.go`

```go
package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"go-rest-api/internal/dto"
	"go-rest-api/internal/service"
	"go-rest-api/pkg/response"
)

type UserHandler struct {
	Service *service.UserService
}

func NewUserHandler(s *service.UserService) *UserHandler {
	return &UserHandler{Service: s}
}

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid json")
		return
	}

	user, err := h.Service.Create(r.Context(), req)
	if err != nil {
		if err == service.ErrInvalidInput {
			response.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, "internal server error")
		return
	}

	response.JSON(w, http.StatusCreated, user)
}

func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	user, err := h.Service.GetByID(r.Context(), id)
	if err != nil {
		if err == service.ErrUserNotFound {
			response.Error(w, http.StatusNotFound, err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, "internal server error")
		return
	}

	response.JSON(w, http.StatusOK, user)
}

func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	users, err := h.Service.List(r.Context(), limit, offset)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "internal server error")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{
		"data": users,
		"pagination": map[string]any{
			"limit":  limit,
			"offset": offset,
		},
	})
}

func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	var req dto.UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid json")
		return
	}

	user, err := h.Service.Update(r.Context(), id, req)
	if err != nil {
		switch err {
		case service.ErrInvalidInput:
			response.Error(w, http.StatusBadRequest, err.Error())
		case service.ErrUserNotFound:
			response.Error(w, http.StatusNotFound, err.Error())
		default:
			response.Error(w, http.StatusInternalServerError, "internal server error")
		}
		return
	}

	response.JSON(w, http.StatusOK, user)
}

func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	if err := h.Service.Delete(r.Context(), id); err != nil {
		if err == service.ErrUserNotFound {
			response.Error(w, http.StatusNotFound, err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, "internal server error")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
```

---

## 7）router

### `internal/app/router.go`

```go
package app

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"go-rest-api/internal/handler"
)

func NewRouter(userHandler *handler.UserHandler) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.Timeout(30))

	r.Route("/api/v1", func(r chi.Router) {
		r.Post("/users", userHandler.CreateUser)
		r.Get("/users", userHandler.ListUsers)
		r.Get("/users/{id}", userHandler.GetUser)
		r.Put("/users/{id}", userHandler.UpdateUser)
		r.Delete("/users/{id}", userHandler.DeleteUser)
	})

	return r
}
```

---

## 8）main

### `cmd/server/main.go`

```go
package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	_ "github.com/lib/pq"

	"go-rest-api/internal/app"
	"go-rest-api/internal/handler"
	"go-rest-api/internal/repository"
	"go-rest-api/internal/service"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatal(err)
	}

	userRepo := repository.NewUserRepository(db)
	userService := service.NewUserService(userRepo)
	userHandler := handler.NewUserHandler(userService)
	router := app.NewRouter(userHandler)

	log.Println("server started on :8080")
	if err := http.ListenAndServe(":8080", router); err != nil {
		log.Fatal(err)
	}
}
```

---

# 四、Java 完整实现

---

## 1）Entity

### `entity/User.java`

```java
package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 120)
    private String email;

    @Column(nullable = false)
    private Integer age;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
```

---

## 2）DTO

### `dto/CreateUserRequest.java`

```java
package com.example.demo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public class CreateUserRequest {

    @NotBlank
    private String name;

    @NotBlank
    @Email
    private String email;

    @Min(0)
    private Integer age;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
}
```

### `dto/UpdateUserRequest.java`

```java
package com.example.demo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public class UpdateUserRequest {

    @NotBlank
    private String name;

    @NotBlank
    @Email
    private String email;

    @Min(0)
    private Integer age;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
}
```

### `dto/UserResponse.java`

```java
package com.example.demo.dto;

import com.example.demo.entity.User;
import java.time.LocalDateTime;

public class UserResponse {
    private Long id;
    private String name;
    private String email;
    private Integer age;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static UserResponse from(User user) {
        UserResponse r = new UserResponse();
        r.id = user.getId();
        r.name = user.getName();
        r.email = user.getEmail();
        r.age = user.getAge();
        r.createdAt = user.getCreatedAt();
        r.updatedAt = user.getUpdatedAt();
        return r;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public Integer getAge() { return age; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
```

---

## 3）Repository

### `repository/UserRepository.java`

```java
package com.example.demo.repository;

import com.example.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByEmail(String email);
}
```

---

## 4）异常类

### `exception/NotFoundException.java`

```java
package com.example.demo.exception;

public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
```

---

## 5）Service

### `service/UserService.java`

```java
package com.example.demo.service;

import com.example.demo.dto.CreateUserRequest;
import com.example.demo.dto.UpdateUserRequest;
import com.example.demo.entity.User;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User create(CreateUserRequest req) {
        User user = new User();
        user.setName(req.getName());
        user.setEmail(req.getEmail());
        user.setAge(req.getAge());
        return userRepository.save(user);
    }

    public User getById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("user not found"));
    }

    public Page<User> list(int page, int size) {
        if (size <= 0) size = 10;
        if (size > 100) size = 100;
        if (page < 0) page = 0;
        return userRepository.findAll(PageRequest.of(page, size));
    }

    public User update(Long id, UpdateUserRequest req) {
        User user = getById(id);
        user.setName(req.getName());
        user.setEmail(req.getEmail());
        user.setAge(req.getAge());
        return userRepository.save(user);
    }

    public void delete(Long id) {
        User user = getById(id);
        userRepository.delete(user);
    }
}
```

---

## 6）Controller

### `controller/UserController.java`

```java
package com.example.demo.controller;

import com.example.demo.dto.CreateUserRequest;
import com.example.demo.dto.UpdateUserRequest;
import com.example.demo.dto.UserResponse;
import com.example.demo.entity.User;
import com.example.demo.service.UserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody CreateUserRequest req) {
        User user = userService.create(req);
        return UserResponse.from(user);
    }

    @GetMapping("/{id}")
    public UserResponse getById(@PathVariable Long id) {
        return UserResponse.from(userService.getById(id));
    }

    @GetMapping
    public Map<String, Object> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Page<User> users = userService.list(page, size);
        return Map.of(
                "data", users.getContent().stream().map(UserResponse::from).toList(),
                "pagination", Map.of(
                        "page", users.getNumber(),
                        "size", users.getSize(),
                        "totalElements", users.getTotalElements(),
                        "totalPages", users.getTotalPages()
                )
        );
    }

    @PutMapping("/{id}")
    public UserResponse update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest req) {
        return UserResponse.from(userService.update(id, req));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        userService.delete(id);
    }
}
```

---

## 7）全局异常处理

### `exception/GlobalExceptionHandler.java`

```java
package com.example.demo.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, Object> handleNotFound(NotFoundException ex) {
        return Map.of("error", ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> handleValidation(MethodArgumentNotValidException ex) {
        return Map.of("error", "invalid request");
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Map<String, Object> handleOther(Exception ex) {
        return Map.of("error", "internal server error");
    }
}
```

---

## 8）启动类

### `DemoApplication.java`

```java
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

---

## 9）配置

### `application.yml`

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/demo
    username: postgres
    password: postgres
  jpa:
    hibernate:
      ddl-auto: none
    show-sql: true
  sql:
    init:
      mode: always

server:
  port: 8080
```

### `schema.sql`

```sql
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    age INT NOT NULL CHECK (age >= 0),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

---

# 五、请求示例对照

## 创建用户

### Go / Java 通用请求

```http
POST /api/v1/users
Content-Type: application/json

{
  "name": "Alice",
  "email": "alice@example.com",
  "age": 28
}
```

### 返回

```json
{
  "id": 1,
  "name": "Alice",
  "email": "alice@example.com",
  "age": 28,
  "created_at": "2026-03-22T10:00:00Z",
  "updated_at": "2026-03-22T10:00:00Z"
}
```

---

## 查询列表

### Go 风格

```http
GET /api/v1/users?limit=10&offset=0
```

### Java 风格

```http
GET /api/v1/users?page=0&size=10
```

这也是一个很典型的差异：

* **Go** 常更自然地写成 `limit/offset`
* **Java/Spring Data** 常直接用 `page/size`

---

# 六、实现差异的核心对照

## 1）分层思想一致，但“重量级程度”不同

两边本质都是：

* Controller / Handler：处理 HTTP
* Service：业务逻辑
* Repository：数据访问
* Model / Entity：数据结构

但差别在于：

### Go

更偏“显式手工装配”：

* 自己 new repo
* 自己 new service
* 自己 new handler
* 自己定义路由
* 自己处理 JSON / 错误 / 参数

优点：

* 依赖关系非常清楚
* 运行时行为更可预测
* 成本低、控制力强

代价：

* 样板代码更多
* 很多基础设施都要自己拼

### Java / Spring

更偏“框架托管”：

* `@RestController`
* `@Service`
* `@Repository`
* `@Valid`
* `@RestControllerAdvice`

优点：

* 企业开发效率高
* 一堆基础设施现成
* 扩展事务、安全、缓存很方便

代价：

* 魔法感更强
* 新人更容易“会用但不理解底层”

---

## 2）参数校验

### Go

你通常会手工做：

```go
if strings.TrimSpace(req.Name) == "" || req.Age < 0 {
    return nil, ErrInvalidInput
}
```

### Java

更常用注解声明：

```java
@NotBlank
@Email
@Min(0)
```

然后配合：

```java
@Valid @RequestBody CreateUserRequest req
```

所以：

* **Go 校验逻辑更显式**
* **Java 校验声明更集中**

---

## 3）错误处理

### Go

惯用模式：

```go
user, err := repo.GetByID(...)
if err != nil { ... }
if user == nil { ... }
```

特点：

* 错误作为返回值层层上传
* 没有异常机制作为主流程

### Java

惯用模式：

```java
return repository.findById(id)
    .orElseThrow(() -> new NotFoundException("user not found"));
```

然后全局异常处理统一转 HTTP 响应。

特点：

* 业务代码更短
* 依赖异常传播机制

---

## 4）数据库访问

### Go

本例用了 `database/sql`，意味着：

* SQL 自己写
* 扫描结果自己做
* 性能与行为非常透明

### Java

本例用了 JPA，意味着：

* CRUD 大量样板逻辑被框架吸收
* 但复杂查询时要注意 ORM 成本、N+1、懒加载等问题

所以在真实项目里常见的取舍是：

* **Go**：喜欢 SQL-first
* **Java**：常常 ORM-first，复杂场景再补 JPQL / native SQL

---

# 七、在“完整 REST API”里还应继续补的能力

如果你是要把这个示例写到“更完整、可用于教学或面试”的程度，建议继续往下补这几块。

## 1）鉴权

例如：

* JWT 登录
* `Authorization: Bearer <token>`
* 中间件 / Filter 做鉴权

### Go

通常写 middleware：

```go
func AuthMiddleware(next http.Handler) http.Handler
```

### Java

通常接 Spring Security：

* `SecurityFilterChain`
* JWT Filter
* Method Security

---

## 2）日志与链路追踪

### Go

常补：

* request id
* structured logging
* access log
* OpenTelemetry

### Java

常补：

* SLF4J + Logback
* MDC traceId
* Micrometer / OpenTelemetry

---

## 3）配置管理

### Go

常见做法：

* `os.Getenv`
* 配置结构体
* 启动时校验必要配置

### Java

常见做法：

* `application.yml`
* `@ConfigurationProperties`
* profile 区分 dev / test / prod

---

## 4）测试

### Go

至少补：

* service 单测
* handler 集成测试
* repository 数据库测试

### Java

至少补：

* service 单测（Mockito）
* controller 测试（MockMvc）
* repository 测试（DataJpaTest）

---

# 八、如果要写成“面试级”答案，可以这样总结

你可以直接用这段作为结论：

> Go 和 Java 都能完整实现 REST API，核心架构都遵循 Handler/Controller、Service、Repository 分层。差别主要不在“能不能做”，而在“怎么做”：
>
> * Go 更强调显式控制、轻框架、手工装配，适合追求简单、透明、性能可控的服务；
> * Java 更强调框架生态、声明式开发和企业级基础设施，适合复杂业务系统和大型团队协作。
>
> 对于一个完整 REST API，Go 的代码通常更接近底层 HTTP 与 SQL，Java 的代码通常更依赖 Spring 提供的自动装配、参数校验、异常处理和 ORM 能力。前者更“裸”、更清晰，后者更“厚”、更高效。

---

# 九、一个非常实用的对照表

| 维度      | Go                   | Java                 |
| ------- | -------------------- | -------------------- |
| HTTP 路由 | chi / gin / net/http | Spring MVC           |
| 参数绑定    | 手工 decode            | `@RequestBody`       |
| 参数校验    | 手工 / validator       | `@Valid` + 注解        |
| 依赖注入    | 手工组装                 | Spring IoC           |
| 错误处理    | `error` 返回值          | exception + advice   |
| DB 访问   | SQL-first 常见         | JPA / JDBC / MyBatis |
| 项目风格    | 轻量、显式                | 企业化、框架化              |
| 样板代码    | 中等                   | 前期少，框架配置多            |
| 性能可控性   | 很强                   | 强，但抽象层更多             |
