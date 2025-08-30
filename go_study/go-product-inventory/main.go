package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	_ "github.com/mattn/go-sqlite3"
)

// 数据模型定义
type Product struct {
	ID           int       `json:"id"`
	SKU          string    `json:"sku"`
	Name         string    `json:"name"`
	CategoryID   int       `json:"category_id"`
	Brand        string    `json:"brand"`
	UnitPrice    float64   `json:"unit_price"`
	ReorderLevel int       `json:"reorder_level"`
	SupplierID   int       `json:"supplier_id"`
	CreatedAt    time.Time `json:"created_at"`
	// 计算字段
	CurrentStock int `json:"current_stock,omitempty"`
}

type InventoryTransaction struct {
	ID              int       `json:"id"`
	ProductID       int       `json:"product_id"`
	TransactionType string    `json:"transaction_type"` // IN, OUT, ADJUST
	Quantity        int       `json:"quantity"`
	UnitCost        float64   `json:"unit_cost"`
	ReferenceNumber string    `json:"reference_number"`
	OperatorID      int       `json:"operator_id"`
	WarehouseID     int       `json:"warehouse_id"`
	CreatedAt       time.Time `json:"created_at"`
	// 关联字段
	ProductName string `json:"product_name,omitempty"`
}

type Category struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Supplier struct {
	ID      int    `json:"id"`
	Name    string `json:"name"`
	Contact string `json:"contact"`
	Email   string `json:"email"`
}

type Warehouse struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Location string `json:"location"`
}

type StockAlert struct {
	ProductID    int    `json:"product_id"`
	ProductName  string `json:"product_name"`
	SKU          string `json:"sku"`
	CurrentStock int    `json:"current_stock"`
	ReorderLevel int    `json:"reorder_level"`
	Shortage     int    `json:"shortage"`
}

type InventoryStats struct {
	TotalProducts     int     `json:"total_products"`
	TotalStockValue   float64 `json:"total_stock_value"`
	LowStockProducts  int     `json:"low_stock_products"`
	OutOfStockProducts int    `json:"out_of_stock_products"`
	TotalTransactions int     `json:"total_transactions"`
}

// 数据库连接
var db *sql.DB

// 初始化数据库
func initDB() {
	var err error
	db, err = sql.Open("sqlite3", "./inventory.db")
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}

	// 创建表结构
	createTables()
	// 插入初始数据
	insertSampleData()
}

func createTables() {
	// 创建分类表
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS categories (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE
		)
	`)
	if err != nil {
		log.Fatal("Failed to create categories table:", err)
	}

	// 创建供应商表
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS suppliers (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			contact TEXT,
			email TEXT
		)
	`)
	if err != nil {
		log.Fatal("Failed to create suppliers table:", err)
	}

	// 创建仓库表
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS warehouses (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			location TEXT
		)
	`)
	if err != nil {
		log.Fatal("Failed to create warehouses table:", err)
	}

	// 创建商品表
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS products (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			sku TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			category_id INTEGER,
			brand TEXT,
			unit_price REAL,
			reorder_level INTEGER DEFAULT 10,
			supplier_id INTEGER,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (category_id) REFERENCES categories(id),
			FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
		)
	`)
	if err != nil {
		log.Fatal("Failed to create products table:", err)
	}

	// 创建库存事务表
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS inventory_transactions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			product_id INTEGER NOT NULL,
			transaction_type TEXT NOT NULL CHECK(transaction_type IN ('IN', 'OUT', 'ADJUST')),
			quantity INTEGER NOT NULL,
			unit_cost REAL,
			reference_number TEXT,
			operator_id INTEGER,
			warehouse_id INTEGER,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (product_id) REFERENCES products(id),
			FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
		)
	`)
	if err != nil {
		log.Fatal("Failed to create inventory_transactions table:", err)
	}
}

func insertSampleData() {
	// 检查是否已有数据
	var count int
	db.QueryRow("SELECT COUNT(*) FROM categories").Scan(&count)
	if count > 0 {
		return // 已有数据，跳过初始化
	}

	// 插入分类
	categories := []string{"电子产品", "服装", "食品", "图书", "家具"}
	for _, cat := range categories {
		db.Exec("INSERT INTO categories (name) VALUES (?)", cat)
	}

	// 插入供应商
	suppliers := [][3]string{
		{"华为技术有限公司", "13800138000", "contact@huawei.com"},
		{"小米科技", "13900139000", "supplier@xiaomi.com"},
		{"阿里巴巴", "400-800-1688", "b2b@alibaba.com"},
	}
	for _, sup := range suppliers {
		db.Exec("INSERT INTO suppliers (name, contact, email) VALUES (?, ?, ?)", sup[0], sup[1], sup[2])
	}

	// 插入仓库
	warehouses := [][2]string{
		{"北京仓库", "北京市朝阳区"},
		{"上海仓库", "上海市浦东新区"},
		{"深圳仓库", "深圳市南山区"},
	}
	for _, wh := range warehouses {
		db.Exec("INSERT INTO warehouses (name, location) VALUES (?, ?)", wh[0], wh[1])
	}

	// 插入示例商品
	products := [][]interface{}{
		{"IPHONE15-001", "iPhone 15 Pro", 1, "Apple", 8999.00, 5, 1},
		{"XIAOMI13-001", "小米13 Ultra", 1, "小米", 5999.00, 10, 2},
		{"TSHIRT-001", "纯棉T恤", 2, "优衣库", 99.00, 50, 3},
		{"BOOK-001", "Go语言编程", 4, "机械工业出版社", 89.00, 20, 3},
	}
	for _, prod := range products {
		db.Exec("INSERT INTO products (sku, name, category_id, brand, unit_price, reorder_level, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
			prod[0], prod[1], prod[2], prod[3], prod[4], prod[5], prod[6])
	}

	// 插入初始库存事务
	transactions := [][]interface{}{
		{1, "IN", 100, 7500.00, "PO-001", 1, 1},
		{2, "IN", 50, 5000.00, "PO-002", 1, 1},
		{3, "IN", 200, 80.00, "PO-003", 1, 2},
		{4, "IN", 100, 70.00, "PO-004", 1, 2},
		{1, "OUT", 10, 0, "SO-001", 1, 1},
		{2, "OUT", 5, 0, "SO-002", 1, 1},
	}
	for _, trans := range transactions {
		db.Exec("INSERT INTO inventory_transactions (product_id, transaction_type, quantity, unit_cost, reference_number, operator_id, warehouse_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
			trans[0], trans[1], trans[2], trans[3], trans[4], trans[5], trans[6])
	}
}

// 启用CORS
func enableCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

func handleOptions(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	w.WriteHeader(http.StatusOK)
}

// 商品管理API
func getProducts(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	category := r.URL.Query().Get("category")
	brand := r.URL.Query().Get("brand")
	lowStock := r.URL.Query().Get("low_stock")
	
	query := `
		SELECT p.id, p.sku, p.name, p.category_id, p.brand, p.unit_price, 
			   p.reorder_level, p.supplier_id, p.created_at,
			   COALESCE(SUM(CASE WHEN it.transaction_type = 'IN' THEN it.quantity 
							   WHEN it.transaction_type = 'OUT' THEN -it.quantity 
							   ELSE it.quantity END), 0) as current_stock
		FROM products p 
		LEFT JOIN inventory_transactions it ON p.id = it.product_id
		WHERE 1=1
	`
	
	args := []interface{}{}
	
	if category != "" {
		query += " AND p.category_id = ?"
		categoryID, _ := strconv.Atoi(category)
		args = append(args, categoryID)
	}
	
	if brand != "" {
		query += " AND p.brand LIKE ?"
		args = append(args, "%"+brand+"%")
	}
	
	query += " GROUP BY p.id"
	
	if lowStock == "true" {
		query += " HAVING current_stock <= p.reorder_level"
	}
	
	query += " ORDER BY p.created_at DESC"
	
	rows, err := db.Query(query, args...)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		err := rows.Scan(&p.ID, &p.SKU, &p.Name, &p.CategoryID, &p.Brand,
			&p.UnitPrice, &p.ReorderLevel, &p.SupplierID, &p.CreatedAt, &p.CurrentStock)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		products = append(products, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}

func getProduct(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid product ID", http.StatusBadRequest)
		return
	}

	query := `
		SELECT p.id, p.sku, p.name, p.category_id, p.brand, p.unit_price, 
			   p.reorder_level, p.supplier_id, p.created_at,
			   COALESCE(SUM(CASE WHEN it.transaction_type = 'IN' THEN it.quantity 
							   WHEN it.transaction_type = 'OUT' THEN -it.quantity 
							   ELSE it.quantity END), 0) as current_stock
		FROM products p 
		LEFT JOIN inventory_transactions it ON p.id = it.product_id
		WHERE p.id = ?
		GROUP BY p.id
	`

	var p Product
	err = db.QueryRow(query, id).Scan(&p.ID, &p.SKU, &p.Name, &p.CategoryID, &p.Brand,
		&p.UnitPrice, &p.ReorderLevel, &p.SupplierID, &p.CreatedAt, &p.CurrentStock)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Product not found", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func createProduct(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	var p Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// 验证必填字段
	if p.SKU == "" || p.Name == "" {
		http.Error(w, "SKU and Name are required", http.StatusBadRequest)
		return
	}

	query := `
		INSERT INTO products (sku, name, category_id, brand, unit_price, reorder_level, supplier_id)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`
	result, err := db.Exec(query, p.SKU, p.Name, p.CategoryID, p.Brand, p.UnitPrice, p.ReorderLevel, p.SupplierID)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			http.Error(w, "SKU already exists", http.StatusConflict)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	id, _ := result.LastInsertId()
	p.ID = int(id)
	p.CreatedAt = time.Now()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(p)
}

func updateProduct(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid product ID", http.StatusBadRequest)
		return
	}

	var p Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	query := `
		UPDATE products 
		SET name = ?, category_id = ?, brand = ?, unit_price = ?, reorder_level = ?, supplier_id = ?
		WHERE id = ?
	`
	result, err := db.Exec(query, p.Name, p.CategoryID, p.Brand, p.UnitPrice, p.ReorderLevel, p.SupplierID, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Product not found", http.StatusNotFound)
		return
	}

	p.ID = id
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func deleteProduct(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid product ID", http.StatusBadRequest)
		return
	}

	// 检查是否有库存事务
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM inventory_transactions WHERE product_id = ?", id).Scan(&count)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if count > 0 {
		http.Error(w, "Cannot delete product with existing transactions", http.StatusConflict)
		return
	}

	result, err := db.Exec("DELETE FROM products WHERE id = ?", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Product not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// 库存事务API
func getTransactions(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	productID := r.URL.Query().Get("product_id")
	transactionType := r.URL.Query().Get("type")
	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")
	
	query := `
		SELECT it.id, it.product_id, it.transaction_type, it.quantity, it.unit_cost,
			   it.reference_number, it.operator_id, it.warehouse_id, it.created_at,
			   p.name as product_name
		FROM inventory_transactions it
		LEFT JOIN products p ON it.product_id = p.id
		WHERE 1=1
	`
	
	args := []interface{}{}
	
	if productID != "" {
		query += " AND it.product_id = ?"
		pID, _ := strconv.Atoi(productID)
		args = append(args, pID)
	}
	
	if transactionType != "" {
		query += " AND it.transaction_type = ?"
		args = append(args, transactionType)
	}
	
	if startDate != "" {
		query += " AND DATE(it.created_at) >= ?"
		args = append(args, startDate)
	}
	
	if endDate != "" {
		query += " AND DATE(it.created_at) <= ?"
		args = append(args, endDate)
	}
	
	query += " ORDER BY it.created_at DESC LIMIT 100"
	
	rows, err := db.Query(query, args...)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var transactions []InventoryTransaction
	for rows.Next() {
		var t InventoryTransaction
		err := rows.Scan(&t.ID, &t.ProductID, &t.TransactionType, &t.Quantity,
			&t.UnitCost, &t.ReferenceNumber, &t.OperatorID, &t.WarehouseID,
			&t.CreatedAt, &t.ProductName)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		transactions = append(transactions, t)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(transactions)
}

func createTransaction(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	var t InventoryTransaction
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// 验证必填字段
	if t.ProductID == 0 || t.TransactionType == "" || t.Quantity == 0 {
		http.Error(w, "ProductID, TransactionType and Quantity are required", http.StatusBadRequest)
		return
	}

	// 验证事务类型
	if t.TransactionType != "IN" && t.TransactionType != "OUT" && t.TransactionType != "ADJUST" {
		http.Error(w, "Invalid transaction type. Must be IN, OUT, or ADJUST", http.StatusBadRequest)
		return
	}

	// 验证商品是否存在
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM products WHERE id = ?)", t.ProductID).Scan(&exists)
	if err != nil || !exists {
		http.Error(w, "Product not found", http.StatusNotFound)
		return
	}

	// 对于出库操作，检查库存是否足够
	if t.TransactionType == "OUT" {
		currentStock := getCurrentStock(t.ProductID)
		if currentStock < t.Quantity {
			http.Error(w, fmt.Sprintf("Insufficient stock. Current: %d, Required: %d", currentStock, t.Quantity), http.StatusBadRequest)
			return
		}
	}

	query := `
		INSERT INTO inventory_transactions (product_id, transaction_type, quantity, unit_cost, reference_number, operator_id, warehouse_id)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`
	result, err := db.Exec(query, t.ProductID, t.TransactionType, t.Quantity, t.UnitCost, t.ReferenceNumber, t.OperatorID, t.WarehouseID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id, _ := result.LastInsertId()
	t.ID = int(id)
	t.CreatedAt = time.Now()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(t)
}

// 获取当前库存
func getCurrentStock(productID int) int {
	var stock int
	query := `
		SELECT COALESCE(SUM(CASE WHEN transaction_type = 'IN' THEN quantity 
							   WHEN transaction_type = 'OUT' THEN -quantity 
							   ELSE quantity END), 0)
		FROM inventory_transactions 
		WHERE product_id = ?
	`
	db.QueryRow(query, productID).Scan(&stock)
	return stock
}

// 库存预警API
func getStockAlerts(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	query := `
		SELECT p.id, p.name, p.sku, p.reorder_level,
			   COALESCE(SUM(CASE WHEN it.transaction_type = 'IN' THEN it.quantity 
							   WHEN it.transaction_type = 'OUT' THEN -it.quantity 
							   ELSE it.quantity END), 0) as current_stock
		FROM products p 
		LEFT JOIN inventory_transactions it ON p.id = it.product_id
		GROUP BY p.id
		HAVING current_stock <= p.reorder_level
		ORDER BY (p.reorder_level - current_stock) DESC
	`

	rows, err := db.Query(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var alerts []StockAlert
	for rows.Next() {
		var alert StockAlert
		err := rows.Scan(&alert.ProductID, &alert.ProductName, &alert.SKU,
			&alert.ReorderLevel, &alert.CurrentStock)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		alert.Shortage = alert.ReorderLevel - alert.CurrentStock
		alerts = append(alerts, alert)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(alerts)
}

// 库存统计API
func getInventoryStats(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	var stats InventoryStats

	// 总商品数
	db.QueryRow("SELECT COUNT(*) FROM products").Scan(&stats.TotalProducts)

	// 总库存价值
	query := `
		SELECT COALESCE(SUM(
			CASE WHEN stock_qty > 0 THEN stock_qty * unit_price ELSE 0 END
		), 0)
		FROM (
			SELECT p.id, p.unit_price,
				   COALESCE(SUM(CASE WHEN it.transaction_type = 'IN' THEN it.quantity 
								   WHEN it.transaction_type = 'OUT' THEN -it.quantity 
								   ELSE it.quantity END), 0) as stock_qty
			FROM products p 
			LEFT JOIN inventory_transactions it ON p.id = it.product_id
			GROUP BY p.id
		) AS stock_summary
	`
	db.QueryRow(query).Scan(&stats.TotalStockValue)

	// 低库存商品数
	query = `
		SELECT COUNT(*)
		FROM (
			SELECT p.id, p.reorder_level,
				   COALESCE(SUM(CASE WHEN it.transaction_type = 'IN' THEN it.quantity 
								   WHEN it.transaction_type = 'OUT' THEN -it.quantity 
								   ELSE it.quantity END), 0) as current_stock
			FROM products p 
			LEFT JOIN inventory_transactions it ON p.id = it.product_id
			GROUP BY p.id
			HAVING current_stock <= p.reorder_level AND current_stock > 0
		)
	`
	db.QueryRow(query).Scan(&stats.LowStockProducts)

	// 缺货商品数
	query = `
		SELECT COUNT(*)
		FROM (
			SELECT p.id,
				   COALESCE(SUM(CASE WHEN it.transaction_type = 'IN' THEN it.quantity 
								   WHEN it.transaction_type = 'OUT' THEN -it.quantity 
								   ELSE it.quantity END), 0) as current_stock
			FROM products p 
			LEFT JOIN inventory_transactions it ON p.id = it.product_id
			GROUP BY p.id
			HAVING current_stock <= 0
		)
	`
	db.QueryRow(query).Scan(&stats.OutOfStockProducts)

	// 总事务数
	db.QueryRow("SELECT COUNT(*) FROM inventory_transactions").Scan(&stats.TotalTransactions)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// 分类管理API
func getCategories(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	rows, err := db.Query("SELECT id, name FROM categories ORDER BY name")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var categories []Category
	for rows.Next() {
		var c Category
		rows.Scan(&c.ID, &c.Name)
		categories = append(categories, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}

func createCategory(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	var c Category
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if c.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	result, err := db.Exec("INSERT INTO categories (name) VALUES (?)", c.Name)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			http.Error(w, "Category name already exists", http.StatusConflict)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	id, _ := result.LastInsertId()
	c.ID = int(id)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(c)
}

// 供应商管理API
func getSuppliers(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	rows, err := db.Query("SELECT id, name, contact, email FROM suppliers ORDER BY name")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var suppliers []Supplier
	for rows.Next() {
		var s Supplier
		rows.Scan(&s.ID, &s.Name, &s.Contact, &s.Email)
		suppliers = append(suppliers, s)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(suppliers)
}

func createSupplier(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	var s Supplier
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if s.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	result, err := db.Exec("INSERT INTO suppliers (name, contact, email) VALUES (?, ?, ?)", s.Name, s.Contact, s.Email)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id, _ := result.LastInsertId()
	s.ID = int(id)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(s)
}

// 仓库管理API
func getWarehouses(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	rows, err := db.Query("SELECT id, name, location FROM warehouses ORDER BY name")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var warehouses []Warehouse
	for rows.Next() {
		var w Warehouse
		rows.Scan(&w.ID, &w.Name, &w.Location)
		warehouses = append(warehouses, w)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(warehouses)
}

func createWarehouse(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	var wh Warehouse
	if err := json.NewDecoder(r.Body).Decode(&wh); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if wh.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	result, err := db.Exec("INSERT INTO warehouses (name, location) VALUES (?, ?)", wh.Name, wh.Location)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id, _ := result.LastInsertId()
	wh.ID = int(id)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(wh)
}

// 批量操作API
type BatchStockUpdate struct {
	ProductID int `json:"product_id"`
	Quantity  int `json:"quantity"`
}

type BatchRequest struct {
	TransactionType string             `json:"transaction_type"`
	ReferenceNumber string             `json:"reference_number"`
	OperatorID      int                `json:"operator_id"`
	WarehouseID     int                `json:"warehouse_id"`
	Items           []BatchStockUpdate `json:"items"`
}

func batchStockUpdate(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	var req BatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if len(req.Items) == 0 {
		http.Error(w, "No items provided", http.StatusBadRequest)
		return
	}

	// 开始事务
	tx, err := db.Begin()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var createdTransactions []InventoryTransaction

	for _, item := range req.Items {
		// 验证商品存在
		var exists bool
		err := tx.QueryRow("SELECT EXISTS(SELECT 1 FROM products WHERE id = ?)", item.ProductID).Scan(&exists)
		if err != nil || !exists {
			http.Error(w, fmt.Sprintf("Product ID %d not found", item.ProductID), http.StatusNotFound)
			return
		}

		// 对于出库操作，检查库存
		if req.TransactionType == "OUT" {
			currentStock := getCurrentStock(item.ProductID)
			if currentStock < item.Quantity {
				http.Error(w, fmt.Sprintf("Insufficient stock for product %d. Current: %d, Required: %d", 
					item.ProductID, currentStock, item.Quantity), http.StatusBadRequest)
				return
			}
		}

		// 插入事务记录
		result, err := tx.Exec(`
			INSERT INTO inventory_transactions (product_id, transaction_type, quantity, unit_cost, reference_number, operator_id, warehouse_id)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`, item.ProductID, req.TransactionType, item.Quantity, 0, req.ReferenceNumber, req.OperatorID, req.WarehouseID)

		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		id, _ := result.LastInsertId()
		transaction := InventoryTransaction{
			ID:              int(id),
			ProductID:       item.ProductID,
			TransactionType: req.TransactionType,
			Quantity:        item.Quantity,
			ReferenceNumber: req.ReferenceNumber,
			OperatorID:      req.OperatorID,
			WarehouseID:     req.WarehouseID,
			CreatedAt:       time.Now(),
		}
		createdTransactions = append(createdTransactions, transaction)
	}

	// 提交事务
	if err := tx.Commit(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":      "Batch update completed successfully",
		"transactions": createdTransactions,
		"total_items":  len(createdTransactions),
	})
}

// 库存报告API
type ProductMovement struct {
	ProductID   int     `json:"product_id"`
	ProductName string  `json:"product_name"`
	SKU         string  `json:"sku"`
	TotalIn     int     `json:"total_in"`
	TotalOut    int     `json:"total_out"`
	NetMovement int     `json:"net_movement"`
	ValueIn     float64 `json:"value_in"`
	ValueOut    float64 `json:"value_out"`
}

func getMovementReport(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")
	
	if startDate == "" {
		startDate = time.Now().AddDate(0, -1, 0).Format("2006-01-02") // 默认一个月前
	}
	if endDate == "" {
		endDate = time.Now().Format("2006-01-02") // 默认今天
	}

	query := `
		SELECT p.id, p.name, p.sku,
			   COALESCE(SUM(CASE WHEN it.transaction_type = 'IN' THEN it.quantity ELSE 0 END), 0) as total_in,
			   COALESCE(SUM(CASE WHEN it.transaction_type = 'OUT' THEN it.quantity ELSE 0 END), 0) as total_out,
			   COALESCE(SUM(CASE WHEN it.transaction_type = 'IN' THEN it.quantity * it.unit_cost ELSE 0 END), 0) as value_in,
			   COALESCE(SUM(CASE WHEN it.transaction_type = 'OUT' THEN it.quantity * p.unit_price ELSE 0 END), 0) as value_out
		FROM products p
		LEFT JOIN inventory_transactions it ON p.id = it.product_id 
			AND DATE(it.created_at) BETWEEN ? AND ?
		GROUP BY p.id
		HAVING total_in > 0 OR total_out > 0
		ORDER BY (total_in + total_out) DESC
	`

	rows, err := db.Query(query, startDate, endDate)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var movements []ProductMovement
	for rows.Next() {
		var m ProductMovement
		err := rows.Scan(&m.ProductID, &m.ProductName, &m.SKU, &m.TotalIn, &m.TotalOut, &m.ValueIn, &m.ValueOut)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		m.NetMovement = m.TotalIn - m.TotalOut
		movements = append(movements, m)
	}

	response := map[string]interface{}{
		"period":    fmt.Sprintf("%s to %s", startDate, endDate),
		"movements": movements,
		"summary": map[string]interface{}{
			"total_products": len(movements),
			"total_in":       func() int { total := 0; for _, m := range movements { total += m.TotalIn }; return total }(),
			"total_out":      func() int { total := 0; for _, m := range movements { total += m.TotalOut }; return total }(),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// 搜索API
func searchProducts(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	keyword := r.URL.Query().Get("q")
	if keyword == "" {
		http.Error(w, "Search keyword is required", http.StatusBadRequest)
		return
	}

	query := `
		SELECT p.id, p.sku, p.name, p.category_id, p.brand, p.unit_price, 
			   p.reorder_level, p.supplier_id, p.created_at,
			   COALESCE(SUM(CASE WHEN it.transaction_type = 'IN' THEN it.quantity 
							   WHEN it.transaction_type = 'OUT' THEN -it.quantity 
							   ELSE it.quantity END), 0) as current_stock
		FROM products p 
		LEFT JOIN inventory_transactions it ON p.id = it.product_id
		WHERE p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?
		GROUP BY p.id
		ORDER BY p.name
		LIMIT 50
	`

	searchTerm := "%" + keyword + "%"
	rows, err := db.Query(query, searchTerm, searchTerm, searchTerm)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		err := rows.Scan(&p.ID, &p.SKU, &p.Name, &p.CategoryID, &p.Brand,
			&p.UnitPrice, &p.ReorderLevel, &p.SupplierID, &p.CreatedAt, &p.CurrentStock)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		products = append(products, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}

// 快速入库API
type QuickStockIn struct {
	ProductID       int     `json:"product_id"`
	Quantity        int     `json:"quantity"`
	UnitCost        float64 `json:"unit_cost"`
	ReferenceNumber string  `json:"reference_number"`
	OperatorID      int     `json:"operator_id"`
	WarehouseID     int     `json:"warehouse_id"`
}

func quickStockIn(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	var req QuickStockIn
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.ProductID == 0 || req.Quantity <= 0 {
		http.Error(w, "ProductID and positive Quantity are required", http.StatusBadRequest)
		return
	}

	// 验证商品存在
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM products WHERE id = ?)", req.ProductID).Scan(&exists)
	if err != nil || !exists {
		http.Error(w, "Product not found", http.StatusNotFound)
		return
	}

	query := `
		INSERT INTO inventory_transactions (product_id, transaction_type, quantity, unit_cost, reference_number, operator_id, warehouse_id)
		VALUES (?, 'IN', ?, ?, ?, ?, ?)
	`
	result, err := db.Exec(query, req.ProductID, req.Quantity, req.UnitCost, req.ReferenceNumber, req.OperatorID, req.WarehouseID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id, _ := result.LastInsertId()
	
	// 获取更新后的库存
	newStock := getCurrentStock(req.ProductID)

	response := map[string]interface{}{
		"transaction_id": int(id),
		"message":        "Stock added successfully",
		"new_stock":      newStock,
		"added_quantity": req.Quantity,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// 快速出库API
type QuickStockOut struct {
	ProductID       int    `json:"product_id"`
	Quantity        int    `json:"quantity"`
	ReferenceNumber string `json:"reference_number"`
	OperatorID      int    `json:"operator_id"`
	WarehouseID     int    `json:"warehouse_id"`
}

func quickStockOut(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	var req QuickStockOut
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.ProductID == 0 || req.Quantity <= 0 {
		http.Error(w, "ProductID and positive Quantity are required", http.StatusBadRequest)
		return
	}

	// 验证商品存在
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM products WHERE id = ?)", req.ProductID).Scan(&exists)
	if err != nil || !exists {
		http.Error(w, "Product not found", http.StatusNotFound)
		return
	}

	// 检查库存
	currentStock := getCurrentStock(req.ProductID)
	if currentStock < req.Quantity {
		http.Error(w, fmt.Sprintf("Insufficient stock. Current: %d, Required: %d", currentStock, req.Quantity), http.StatusBadRequest)
		return
	}

	query := `
		INSERT INTO inventory_transactions (product_id, transaction_type, quantity, unit_cost, reference_number, operator_id, warehouse_id)
		VALUES (?, 'OUT', ?, 0, ?, ?, ?)
	`
	result, err := db.Exec(query, req.ProductID, req.Quantity, req.ReferenceNumber, req.OperatorID, req.WarehouseID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id, _ := result.LastInsertId()
	newStock := getCurrentStock(req.ProductID)

	response := map[string]interface{}{
		"transaction_id":   int(id),
		"message":          "Stock removed successfully",
		"new_stock":        newStock,
		"removed_quantity": req.Quantity,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// 库存调整API
type StockAdjustment struct {
	ProductID       int    `json:"product_id"`
	NewQuantity     int    `json:"new_quantity"`
	Reason          string `json:"reason"`
	OperatorID      int    `json:"operator_id"`
	WarehouseID     int    `json:"warehouse_id"`
}

func adjustStock(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	var req StockAdjustment
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.ProductID == 0 {
		http.Error(w, "ProductID is required", http.StatusBadRequest)
		return
	}

	// 验证商品存在
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM products WHERE id = ?)", req.ProductID).Scan(&exists)
	if err != nil || !exists {
		http.Error(w, "Product not found", http.StatusNotFound)
		return
	}

	currentStock := getCurrentStock(req.ProductID)
	adjustment := req.NewQuantity - currentStock

	if adjustment == 0 {
		http.Error(w, "No adjustment needed - current stock matches target", http.StatusBadRequest)
		return
	}

	refNumber := fmt.Sprintf("ADJ-%d-%d", req.ProductID, time.Now().Unix())
	if req.Reason != "" {
		refNumber += "-" + req.Reason
	}

	query := `
		INSERT INTO inventory_transactions (product_id, transaction_type, quantity, unit_cost, reference_number, operator_id, warehouse_id)
		VALUES (?, 'ADJUST', ?, 0, ?, ?, ?)
	`
	result, err := db.Exec(query, req.ProductID, adjustment, refNumber, req.OperatorID, req.WarehouseID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id, _ := result.LastInsertId()

	response := map[string]interface{}{
		"transaction_id":  int(id),
		"message":         "Stock adjusted successfully",
		"previous_stock":  currentStock,
		"new_stock":       req.NewQuantity,
		"adjustment":      adjustment,
		"adjustment_type": func() string { if adjustment > 0 { return "increase" } else { return "decrease" } }(),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// 库存历史API
type StockHistory struct {
	Date        string `json:"date"`
	StockLevel  int    `json:"stock_level"`
	Transaction struct {
		Type            string `json:"type"`
		Quantity        int    `json:"quantity"`
		ReferenceNumber string `json:"reference_number"`
	} `json:"transaction,omitempty"`
}

func getProductStockHistory(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	vars := mux.Vars(r)
	productID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid product ID", http.StatusBadRequest)
		return
	}

	days := r.URL.Query().Get("days")
	if days == "" {
		days = "30" // 默认30天
	}
	daysInt, _ := strconv.Atoi(days)

	query := `
		SELECT DATE(created_at) as date, transaction_type, quantity, reference_number
		FROM inventory_transactions
		WHERE product_id = ? AND created_at >= DATE('now', '-' || ? || ' days')
		ORDER BY created_at ASC
	`

	rows, err := db.Query(query, productID, daysInt)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var history []StockHistory
	runningStock := 0

	// 获取历史起始库存
	startQuery := `
		SELECT COALESCE(SUM(CASE WHEN transaction_type = 'IN' THEN quantity 
							   WHEN transaction_type = 'OUT' THEN -quantity 
							   ELSE quantity END), 0)
		FROM inventory_transactions
		WHERE product_id = ? AND created_at < DATE('now', '-' || ? || ' days')
	`
	db.QueryRow(startQuery, productID, daysInt).Scan(&runningStock)

	for rows.Next() {
		var h StockHistory
		var transType string
		var quantity int
		var refNumber string

		err := rows.Scan(&h.Date, &transType, &quantity, &refNumber)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// 计算库存变化
		switch transType {
		case "IN":
			runningStock += quantity
		case "OUT":
			runningStock -= quantity
		case "ADJUST":
			runningStock += quantity // adjustment已经是差值
		}

		h.StockLevel = runningStock
		h.Transaction.Type = transType
		h.Transaction.Quantity = quantity
		h.Transaction.ReferenceNumber = refNumber

		history = append(history, h)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}

// 设置路由
func setupRoutes() *mux.Router {
	r := mux.NewRouter()

	// 处理预检请求
	r.Methods("OPTIONS").HandlerFunc(handleOptions)

	// 商品管理路由
	r.HandleFunc("/api/products", getProducts).Methods("GET")
	r.HandleFunc("/api/products", createProduct).Methods("POST")
	r.HandleFunc("/api/products/{id}", getProduct).Methods("GET")
	r.HandleFunc("/api/products/{id}", updateProduct).Methods("PUT")
	r.HandleFunc("/api/products/{id}", deleteProduct).Methods("DELETE")
	r.HandleFunc("/api/products/search", searchProducts).Methods("GET")
	r.HandleFunc("/api/products/{id}/history", getProductStockHistory).Methods("GET")

	// 库存事务路由
	r.HandleFunc("/api/transactions", getTransactions).Methods("GET")
	r.HandleFunc("/api/transactions", createTransaction).Methods("POST")
	r.HandleFunc("/api/transactions/batch", batchStockUpdate).Methods("POST")
	r.HandleFunc("/api/stock/in", quickStockIn).Methods("POST")
	r.HandleFunc("/api/stock/out", quickStockOut).Methods("POST")
	r.HandleFunc("/api/stock/adjust", adjustStock).Methods("POST")

	// 统计和报告路由
	r.HandleFunc("/api/stats", getInventoryStats).Methods("GET")
	r.HandleFunc("/api/alerts", getStockAlerts).Methods("GET")
	r.HandleFunc("/api/reports/movement", getMovementReport).Methods("GET")

	// 基础数据路由
	r.HandleFunc("/api/categories", getCategories).Methods("GET")
	r.HandleFunc("/api/categories", createCategory).Methods("POST")
	r.HandleFunc("/api/suppliers", getSuppliers).Methods("GET")
	r.HandleFunc("/api/suppliers", createSupplier).Methods("POST")
	r.HandleFunc("/api/warehouses", getWarehouses).Methods("GET")
	r.HandleFunc("/api/warehouses", createWarehouse).Methods("POST")

	// 健康检查
	r.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
			"version":   "1.0.0",
		})
	}).Methods("GET")

	// API文档
	r.HandleFunc("/api/docs", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w)
		docs := map[string]interface{}{
			"title":       "库存管理系统API",
			"version":     "1.0.0",
			"description": "完整的库存管理系统REST API",
			"endpoints": map[string]interface{}{
				"products": map[string]string{
					"GET /api/products":              "获取商品列表，支持分类、品牌、低库存筛选",
					"POST /api/products":             "创建新商品",
					"GET /api/products/{id}":         "获取单个商品详情",
					"PUT /api/products/{id}":         "更新商品信息",
					"DELETE /api/products/{id}":      "删除商品",
					"GET /api/products/search":       "搜索商品（参数: q）",
					"GET /api/products/{id}/history": "获取商品库存历史",
				},
				"inventory": map[string]string{
					"GET /api/transactions":       "获取库存事务记录",
					"POST /api/transactions":      "创建库存事务",
					"POST /api/transactions/batch": "批量库存操作",
					"POST /api/stock/in":          "快速入库",
					"POST /api/stock/out":         "快速出库",
					"POST /api/stock/adjust":      "库存调整",
				},
				"reports": map[string]string{
					"GET /api/stats":             "获取库存统计信息",
					"GET /api/alerts":            "获取库存预警",
					"GET /api/reports/movement":  "获取库存变动报告",
				},
				"master_data": map[string]string{
					"GET /api/categories":   "获取分类列表",
					"POST /api/categories":  "创建分类",
					"GET /api/suppliers":    "获取供应商列表",
					"POST /api/suppliers":   "创建供应商",
					"GET /api/warehouses":   "获取仓库列表",
					"POST /api/warehouses":  "创建仓库",
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(docs)
	}).Methods("GET")

	return r
}

func main() {
	// 初始化数据库
	initDB()
	defer db.Close()

	// 设置路由
	router := setupRoutes()

	// 启动服务器
	fmt.Println("库存管理系统API服务启动...")
	fmt.Println("服务地址: http://localhost:8080")
	fmt.Println("API文档: http://localhost:8080/api/docs")
	fmt.Println("健康检查: http://localhost:8080/api/health")
	fmt.Println("")
	fmt.Println("主要功能:")
	fmt.Println("• 商品管理: 增删改查、搜索")
	fmt.Println("• 库存事务: 入库、出库、调整、批量操作")
	fmt.Println("• 统计报告: 库存统计、预警、变动报告")
	fmt.Println("• 基础数据: 分类、供应商、仓库管理")
	fmt.Println("")
	fmt.Println("按 Ctrl+C 停止服务...")

	log.Fatal(http.ListenAndServe(":8080", router))
}

// 使用说明和示例
/*
=== 库存管理系统使用指南 ===

1. 安装依赖:
   go mod init inventory-system
   go get github.com/gorilla/mux
   go get github.com/mattn/go-sqlite3

2. 运行系统:
   go run main.go

3. API使用示例:

// 创建商品
curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "LAPTOP-001",
    "name": "ThinkPad X1",
    "category_id": 1,
    "brand": "Lenovo",
    "unit_price": 12999.00,
    "reorder_level": 5,
    "supplier_id": 1
  }'

// 快速入库
curl -X POST http://localhost:8080/api/stock/in \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "quantity": 50,
    "unit_cost": 8000.00,
    "reference_number": "PO-2025-001",
    "operator_id": 1,
    "warehouse_id": 1
  }'

// 快速出库
curl -X POST http://localhost:8080/api/stock/out \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "quantity": 5,
    "reference_number": "SO-2025-001",
    "operator_id": 1,
    "warehouse_id": 1
  }'

// 批量操作
curl -X POST http://localhost:8080/api/transactions/batch \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_type": "OUT",
    "reference_number": "BATCH-OUT-001",
    "operator_id": 1,
    "warehouse_id": 1,
    "items": [
      {"product_id": 1, "quantity": 2},
      {"product_id": 2, "quantity": 3}
    ]
  }'

// 库存调整
curl -X POST http://localhost:8080/api/stock/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "new_quantity": 100,
    "reason": "盘点调整",
    "operator_id": 1,
    "warehouse_id": 1
  }'

// 查询库存预警
curl http://localhost:8080/api/alerts

// 查询库存统计
curl http://localhost:8080/api/stats

// 搜索商品
curl "http://localhost:8080/api/products/search?q=iPhone"

// 获取变动报告
curl "http://localhost:8080/api/reports/movement?start_date=2025-08-01&end_date=2025-08-30"

4. 前端集成示例 (JavaScript):

// 获取商品列表
async function getProducts() {
  const response = await fetch('http://localhost:8080/api/products');
  const products = await response.json();
  return products;
}

// 创建入库事务
async function stockIn(productId, quantity, unitCost) {
  const response = await fetch('http://localhost:8080/api/stock/in', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: productId,
      quantity: quantity,
      unit_cost: unitCost,
      reference_number: `IN-${Date.now()}`,
      operator_id: 1,
      warehouse_id: 1
    })
  });
  return await response.json();
}

// 获取库存预警
async function getStockAlerts() {
  const response = await fetch('http://localhost:8080/api/alerts');
  const alerts = await response.json();
  return alerts;
}

5. 数据库结构说明:
   - products: 商品主表
   - inventory_transactions: 库存事务表
   - categories: 商品分类表
   - suppliers: 供应商表
   - warehouses: 仓库表

6. 事务类型说明:
   - IN: 入库（增加库存）
   - OUT: 出库（减少库存）
   - ADJUST: 调整（可正可负，用于盘点调整）

7. 高级功能:
   - 自动库存计算（基于所有事务记录）
   - 库存不足检查（出库时验证）
   - 批量操作事务支持
   - 库存预警系统
   - 详细的库存变动报告
   - 商品库存历史追踪

8. 错误处理:
   - 数据验证
   - 库存不足检查
   - 重复SKU检查
   - 关联数据验证
   - 友好的错误信息

系统已包含完整的示例数据，启动后即可测试所有功能。
所有API都支持跨域访问，可直接供前端调用。
*/