package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	_ "modernc.org/sqlite"
)

// -------------------------
// Models (JSON schemas)
// -------------------------

// Monetary values are stored in integer cents to avoid floating point issues.

type Customer struct {
	ID         int64   `json:"customer_id"`
	Name       string  `json:"name"`
	Email      *string `json:"email,omitempty"`
	SignupDate string  `json:"signup_date"`
	Segment    *string `json:"segment,omitempty"`
}

type Product struct {
	ID         int64  `json:"product_id"`
	Name       string `json:"product_name"`
	Category   string `json:"category"`
	PriceCents int64  `json:"price_cents"`
	CostCents  int64  `json:"cost_cents"`
}

type Order struct {
	ID        int64           `json:"order_id"`
	CustomerID int64          `json:"customer_id"`
	OrderTS   string          `json:"order_ts"`
	Status    string          `json:"status"`
	Extra     json.RawMessage `json:"extra,omitempty"`

	// Computed/expanded fields
	Items         []OrderItem `json:"items,omitempty"`
	Payments      []Payment   `json:"payments,omitempty"`
	ItemsTotal    int64       `json:"items_total_cents,omitempty"`
	PaidTotal     int64       `json:"paid_total_cents,omitempty"`
	Outstanding   int64       `json:"outstanding_cents,omitempty"`
}

type OrderItem struct {
	OrderID     int64 `json:"order_id"`
	ProductID   int64 `json:"product_id"`
	Qty         int   `json:"qty"`
	PriceAtSale int64 `json:"price_cents_at_sale"`
}

type Payment struct {
	ID        int64  `json:"payment_id"`
	OrderID   int64  `json:"order_id"`
	Amount    int64  `json:"paid_amount_cents"`
	PaidTS    string `json:"paid_ts"`
	Method    string `json:"method"`
}

// -------------
// Main
// -------------

func main() {
	addr := env("ADDR", ":8080")
	dsn := env("SQLITE_DSN", "file:ecommerce.db?cache=shared&mode=rwc")

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		log.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	if err := initDB(db); err != nil {
		log.Fatalf("init db: %v", err)
	}

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"}, // frontend can call from anywhere
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders: []string{"Link"},
		AllowCredentials: false,
		MaxAge: 300,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "time": time.Now().UTC().Format(time.RFC3339)})
	})

	// Customers
	r.Route("/customers", func(r chi.Router) {
		r.Get("/", listCustomersHandler(db))
		r.Post("/", createCustomerHandler(db))
		r.Route("/{id}", func(r chi.Router) {
			r.Get("/", getCustomerHandler(db))
			r.Put("/", updateCustomerHandler(db))
			r.Delete("/", deleteCustomerHandler(db))
			r.Get("/summary", customerSummaryHandler(db))
		})
	})

	// Products
	r.Route("/products", func(r chi.Router) {
		r.Get("/", listProductsHandler(db))
		r.Post("/", createProductHandler(db))
		r.Route("/{id}", func(r chi.Router) {
			r.Get("/", getProductHandler(db))
			r.Put("/", updateProductHandler(db))
			r.Delete("/", deleteProductHandler(db))
		})
	})

	// Orders & Payments
	r.Route("/orders", func(r chi.Router) {
		r.Get("/", listOrdersHandler(db))
		r.Post("/", createOrderHandler(db))
		r.Route("/{id}", func(r chi.Router) {
			r.Get("/", getOrderHandler(db))
			r.Put("/status", updateOrderStatusHandler(db))
			r.Post("/payments", addPaymentHandler(db))
		})
	})

	// Analytics endpoints for business reporting
	r.Route("/analytics", func(r chi.Router) {
		r.Get("/daily-gmv", analyticsDailyGMVHandler(db))
	})

	// Seed endpoint (optional, guarded by env SEED_ENABLED)
	if env("SEED_ENABLED", "false") == "true" {
		r.Post("/_seed", seedHandler(db))
	}

	log.Printf("ecommerce API listening on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatal(err)
	}
}

func env(k, def string) string { if v := os.Getenv(k); v != "" { return v } ; return def }

// -------------------------
// DB init & migrations
// -------------------------

func initDB(db *sql.DB) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// Enable FK constraints
	if _, err := db.ExecContext(ctx, `PRAGMA foreign_keys = ON;`); err != nil {
		return err
	}

	stmts := []string{
		`CREATE TABLE IF NOT EXISTS customers (
			customer_id   INTEGER PRIMARY KEY AUTOINCREMENT,
			name          TEXT NOT NULL,
			email         TEXT UNIQUE,
			signup_date   TEXT NOT NULL DEFAULT (date('now')),
			segment       TEXT
		);`,
		`CREATE TABLE IF NOT EXISTS products (
			product_id    INTEGER PRIMARY KEY AUTOINCREMENT,
			product_name  TEXT NOT NULL,
			category      TEXT,
			price_cents   INTEGER NOT NULL,
			cost_cents    INTEGER NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS orders (
			order_id    INTEGER PRIMARY KEY AUTOINCREMENT,
			customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
			order_ts    TEXT NOT NULL DEFAULT (datetime('now')),
			status      TEXT NOT NULL CHECK(status IN ('created','paid','refunded','cancelled')) DEFAULT 'created',
			extra       TEXT
		);`,
		`CREATE TABLE IF NOT EXISTS order_items (
			order_id      INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
			product_id    INTEGER NOT NULL REFERENCES products(product_id),
			qty           INTEGER NOT NULL CHECK (qty > 0),
			price_cents_at_sale INTEGER NOT NULL,
			PRIMARY KEY(order_id, product_id)
		);`,
		`CREATE TABLE IF NOT EXISTS payments (
			payment_id  INTEGER PRIMARY KEY AUTOINCREMENT,
			order_id    INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
			paid_amount_cents INTEGER NOT NULL CHECK(paid_amount_cents >= 0),
			paid_ts     TEXT NOT NULL DEFAULT (datetime('now')),
			method      TEXT
		);`,
		`CREATE INDEX IF NOT EXISTS idx_orders_customer_ts ON orders(customer_id, order_ts);`,
		`CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);`,
	}
	for _, s := range stmts {
		if _, err := db.ExecContext(ctx, s); err != nil {
			return fmt.Errorf("migrate: %w", err)
		}
	}
	return nil
}

// -------------------------
// Helpers
// -------------------------

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func parseIDParam(r *http.Request, key string) (int64, error) {
	idStr := chi.URLParam(r, key)
	if idStr == "" {
		return 0, errors.New("missing id")
	}
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil { return 0, err }
	return id, nil
}

func queryInt(r *http.Request, key string, def int) int {
	v := r.URL.Query().Get(key)
	if v == "" { return def }
	i, err := strconv.Atoi(v)
	if err != nil { return def }
	return i
}

func queryStr(r *http.Request, key, def string) string {
	v := r.URL.Query().Get(key)
	if v == "" { return def }
	return v
}

// -------------------------
// Customers Handlers
// -------------------------

func listCustomersHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := strings.TrimSpace(r.URL.Query().Get("search"))
		page := queryInt(r, "page", 1)
		size := queryInt(r, "page_size", 20)
		if size > 100 { size = 100 }
		offset := (page - 1) * size

		var rows *sql.Rows
		var err error
		if q == "" {
			rows, err = db.Query(`SELECT customer_id, name, email, signup_date, segment
				FROM customers ORDER BY customer_id DESC LIMIT ? OFFSET ?`, size, offset)
		} else {
			like := "%" + q + "%"
			rows, err = db.Query(`SELECT customer_id, name, email, signup_date, segment
				FROM customers WHERE name LIKE ? OR COALESCE(email,'') LIKE ?
				ORDER BY customer_id DESC LIMIT ? OFFSET ?`, like, like, size, offset)
		}
		if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		defer rows.Close()
		res := []Customer{}
		for rows.Next() {
			var c Customer
			var email, seg sql.NullString
			if err := rows.Scan(&c.ID, &c.Name, &email, &c.SignupDate, &seg); err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
			if email.Valid { c.Email = &email.String }
			if seg.Valid { c.Segment = &seg.String }
			res = append(res, c)
		}
		writeJSON(w, 200, map[string]any{"data": res, "page": page, "page_size": size})
	}
}

func createCustomerHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var in struct{
			Name string `json:"name"`
			Email *string `json:"email"`
			Segment *string `json:"segment"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil { writeJSON(w, 400, map[string]string{"error": "invalid json"}); return }
		if strings.TrimSpace(in.Name) == "" { writeJSON(w, 400, map[string]string{"error": "name required"}); return }
		res, err := db.Exec(`INSERT INTO customers(name, email, segment) VALUES(?,?,?)`, in.Name, in.Email, in.Segment)
		if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		id, _ := res.LastInsertId()
		row := db.QueryRow(`SELECT customer_id, name, email, signup_date, segment FROM customers WHERE customer_id=?`, id)
		var c Customer
		var email, seg sql.NullString
		if err := row.Scan(&c.ID, &c.Name, &email, &c.SignupDate, &seg); err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		if email.Valid { c.Email = &email.String }
		if seg.Valid { c.Segment = &seg.String }
		writeJSON(w, 201, c)
	}
}

func getCustomerHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parseIDParam(r, "id")
		if err != nil { writeJSON(w, 400, map[string]string{"error": err.Error()}); return }
		row := db.QueryRow(`SELECT customer_id, name, email, signup_date, segment FROM customers WHERE customer_id=?`, id)
		var c Customer
		var email, seg sql.NullString
		if err := row.Scan(&c.ID, &c.Name, &email, &c.SignupDate, &seg); err != nil {
			if errors.Is(err, sql.ErrNoRows) { writeJSON(w, 404, map[string]string{"error": "not found"}); return }
			writeJSON(w, 500, map[string]string{"error": err.Error()}); return
		}
		if email.Valid { c.Email = &email.String }
		if seg.Valid { c.Segment = &seg.String }
		writeJSON(w, 200, c)
	}
}

func updateCustomerHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parseIDParam(r, "id")
		if err != nil { writeJSON(w, 400, map[string]string{"error": err.Error()}); return }
		var in struct{ Name *string `json:"name"`; Email *string `json:"email"`; Segment *string `json:"segment"` }
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil { writeJSON(w, 400, map[string]string{"error": "invalid json"}); return }
		// dynamic update
		set := []string{}
		args := []any{}
		if in.Name != nil { set = append(set, "name=?"); args = append(args, *in.Name) }
		if in.Email != nil { set = append(set, "email=?"); args = append(args, *in.Email) }
		if in.Segment != nil { set = append(set, "segment=?"); args = append(args, *in.Segment) }
		if len(set)==0 { writeJSON(w, 400, map[string]string{"error": "no fields to update"}); return }
		args = append(args, id)
		_, err = db.Exec("UPDATE customers SET "+strings.Join(set, ", ")+" WHERE customer_id=?", args...)
		if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		getCustomerHandler(db)(w, r)
	}
}

func deleteCustomerHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parseIDParam(r, "id")
		if err != nil { writeJSON(w, 400, map[string]string{"error": err.Error()}); return }
		_, err = db.Exec(`DELETE FROM customers WHERE customer_id=?`, id)
		if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		writeJSON(w, 204, map[string]any{"deleted": id})
	}
}

func customerSummaryHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parseIDParam(r, "id")
		if err != nil { writeJSON(w, 400, map[string]string{"error": err.Error()}); return }
		// Basic info
		row := db.QueryRow(`SELECT customer_id, name, email, signup_date FROM customers WHERE customer_id=?`, id)
		var cID int64; var name, signup string; var email sql.NullString
		if err := row.Scan(&cID, &name, &email, &signup); err != nil { writeJSON(w, 404, map[string]string{"error": "not found"}); return }
		// Aggregates
		row = db.QueryRow(`SELECT COUNT(DISTINCT o.order_id) orders,
			COALESCE(SUM(oi.qty*oi.price_cents_at_sale),0) gmv
			FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.order_id
			WHERE o.customer_id=? AND o.status IN ('created','paid','refunded')`, id)
		var orders int64; var gmv int64
		_ = row.Scan(&orders, &gmv)
		writeJSON(w, 200, map[string]any{
			"customer_id": id,
			"name": name,
			"email": nullableString(email),
			"signup_date": signup,
			"orders": orders,
			"gmv_cents": gmv,
		})
	}
}

func nullableString(ns sql.NullString) *string { if ns.Valid { return &ns.String } ; return nil }

// -------------------------
// Products Handlers
// -------------------------

func listProductsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		page := queryInt(r, "page", 1)
		size := queryInt(r, "page_size", 50)
		if size > 200 { size = 200 }
		offset := (page-1)*size
		rows, err := db.Query(`SELECT product_id, product_name, category, price_cents, cost_cents
			FROM products ORDER BY product_id DESC LIMIT ? OFFSET ?`, size, offset)
		if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		defer rows.Close()
		res := []Product{}
		for rows.Next() {
			var p Product
			if err := rows.Scan(&p.ID, &p.Name, &p.Category, &p.PriceCents, &p.CostCents); err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
			res = append(res, p)
		}
		writeJSON(w, 200, map[string]any{"data": res, "page": page, "page_size": size})
	}
}

func createProductHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var in struct{ Name string `json:"product_name"`; Category string `json:"category"`; PriceCents int64 `json:"price_cents"`; CostCents int64 `json:"cost_cents"` }
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil { writeJSON(w, 400, map[string]string{"error":"invalid json"}); return }
		if strings.TrimSpace(in.Name) == "" { writeJSON(w, 400, map[string]string{"error":"product_name required"}); return }
		if in.PriceCents <= 0 || in.CostCents < 0 { writeJSON(w, 400, map[string]string{"error":"invalid price/cost"}); return }
		res, err := db.Exec(`INSERT INTO products(product_name, category, price_cents, cost_cents) VALUES(?,?,?,?)`, in.Name, in.Category, in.PriceCents, in.CostCents)
		if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		id, _ := res.LastInsertId()
		row := db.QueryRow(`SELECT product_id, product_name, category, price_cents, cost_cents FROM products WHERE product_id=?`, id)
		var p Product
		if err := row.Scan(&p.ID, &p.Name, &p.Category, &p.PriceCents, &p.CostCents); err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		writeJSON(w, 201, p)
	}
}

func getProductHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parseIDParam(r, "id")
		if err != nil { writeJSON(w, 400, map[string]string{"error": err.Error()}); return }
		row := db.QueryRow(`SELECT product_id, product_name, category, price_cents, cost_cents FROM products WHERE product_id=?`, id)
		var p Product
		if err := row.Scan(&p.ID, &p.Name, &p.Category, &p.PriceCents, &p.CostCents); err != nil {
			if errors.Is(err, sql.ErrNoRows) { writeJSON(w, 404, map[string]string{"error":"not found"}); return }
			writeJSON(w, 500, map[string]string{"error": err.Error()}); return
		}
		writeJSON(w, 200, p)
	}
}

func updateProductHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parseIDParam(r, "id")
		if err != nil { writeJSON(w, 400, map[string]string{"error": err.Error()}); return }
		var in struct{ Name *string `json:"product_name"`; Category *string `json:"category"`; PriceCents *int64 `json:"price_cents"`; CostCents *int64 `json:"cost_cents"` }
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil { writeJSON(w, 400, map[string]string{"error":"invalid json"}); return }
		set := []string{}; args := []any{}
		if in.Name != nil { set = append(set, "product_name=?"); args = append(args, *in.Name) }
		if in.Category != nil { set = append(set, "category=?"); args = append(args, *in.Category) }
		if in.PriceCents != nil { set = append(set, "price_cents=?"); args = append(args, *in.PriceCents) }
		if in.CostCents != nil { set = append(set, "cost_cents=?"); args = append(args, *in.CostCents) }
		if len(set)==0 { writeJSON(w, 400, map[string]string{"error":"no fields to update"}); return }
		args = append(args, id)
		_, err = db.Exec("UPDATE products SET "+strings.Join(set, ", ")+" WHERE product_id=?", args...)
		if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		getProductHandler(db)(w, r)
	}
}

func deleteProductHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parseIDParam(r, "id")
		if err != nil { writeJSON(w, 400, map[string]string{"error": err.Error()}); return }
		_, err = db.Exec(`DELETE FROM products WHERE product_id=?`, id)
		if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		writeJSON(w, 204, map[string]any{"deleted": id})
	}
}

// -------------------------
// Orders & Payments Handlers
// -------------------------

type CreateOrderItemIn struct {
	ProductID int64 `json:"product_id"`
	Qty       int   `json:"qty"`
	// optional; if omitted, price will be copied from products table
	PriceAtSale *int64 `json:"price_cents_at_sale,omitempty"`
}

type CreatePaymentIn struct {
	Amount int64  `json:"paid_amount_cents"`
	Method string `json:"method"`
}

type CreateOrderIn struct {
	CustomerID int64              `json:"customer_id"`
	Items      []CreateOrderItemIn `json:"items"`
	Payments   []CreatePaymentIn  `json:"payments,omitempty"`
	Status     *string            `json:"status,omitempty"` // will be auto-evaluated as needed
	Extra      json.RawMessage    `json:"extra,omitempty"`
}

func createOrderHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var in CreateOrderIn
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil { writeJSON(w, 400, map[string]string{"error":"invalid json"}); return }
		if in.CustomerID == 0 || len(in.Items) == 0 { writeJSON(w, 400, map[string]string{"error":"customer_id and items required"}); return }

		tx, err := db.BeginTx(r.Context(), &sql.TxOptions{})
		if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		defer func(){ _ = tx.Rollback() }()

		// create order (status defaults to 'created')
		var status = "created"
		if in.Status != nil { status = *in.Status }
		res, err := tx.Exec(`INSERT INTO orders(customer_id, status, extra) VALUES(?,?,?)`, in.CustomerID, status, nullIfEmpty(in.Extra))
		if err != nil { writeJSON(w, 400, map[string]string{"error": err.Error()}); return }
		orderID, _ := res.LastInsertId()

		// insert items
		for _, it := range in.Items {
			if it.Qty <= 0 { writeJSON(w, 400, map[string]string{"error":"qty must be > 0"}); return }
			price := it.PriceAtSale
			if price == nil {
				row := tx.QueryRow(`SELECT price_cents FROM products WHERE product_id=?`, it.ProductID)
				var p int64
				if err := row.Scan(&p); err != nil { writeJSON(w, 400, map[string]string{"error":"invalid product_id"}); return }
				price = &p
			}
			if _, err := tx.Exec(`INSERT INTO order_items(order_id, product_id, qty, price_cents_at_sale) VALUES(?,?,?,?)`, orderID, it.ProductID, it.Qty, *price); err != nil {
				writeJSON(w, 400, map[string]string{"error": err.Error()}); return
			}
		}

		// optional payments
		for _, p := range in.Payments {
			if p.Amount < 0 { writeJSON(w, 400, map[string]string{"error":"payment amount must be >=0"}); return }
			if _, err := tx.Exec(`INSERT INTO payments(order_id, paid_amount_cents, method) VALUES(?,?,?)`, orderID, p.Amount, p.Method); err != nil {
				writeJSON(w, 400, map[string]string{"error": err.Error()}); return
			}
		}

		// auto-set status if fully paid
		if err := autoSetOrderStatusTx(tx, orderID); err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }

		if err := tx.Commit(); err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }

		r = r.WithContext(context.WithValue(r.Context(), ctxKeyOrderID{}, orderID))
		getOrderHandler(db)(w, r)
	}
}

func listOrdersHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		page := queryInt(r, "page", 1)
		size := queryInt(r, "page_size", 20)
		if size > 100 { size = 100 }
		offset := (page - 1) * size
		status := queryStr(r, "status", "")
		custID := queryStr(r, "customer_id", "")
		from := queryStr(r, "from", "") // ISO datetime
		to := queryStr(r, "to", "")

		where := []string{"1=1"}
		args := []any{}
		if status != "" { where = append(where, "status=?"); args = append(args, status) }
		if custID != "" { where = append(where, "customer_id=?"); args = append(args, custID) }
		if from != "" { where = append(where, "order_ts >= ?"); args = append(args, from) }
		if to != "" { where = append(where, "order_ts < ?"); args = append(args, to) }

		q := `WITH items AS (
			SELECT order_id, SUM(qty*price_cents_at_sale) AS items_total FROM order_items GROUP BY order_id
		), pays AS (
			SELECT order_id, SUM(paid_amount_cents) AS paid_total FROM payments GROUP BY order_id
		)
		SELECT o.order_id, o.customer_id, o.order_ts, o.status, COALESCE(items.items_total,0), COALESCE(pays.paid_total,0)
		FROM orders o
		LEFT JOIN items ON items.order_id=o.order_id
		LEFT JOIN pays  ON pays.order_id=o.order_id
		WHERE ` + strings.Join(where, " AND ") + `
		ORDER BY o.order_id DESC LIMIT ? OFFSET ?`
		args = append(args, size, offset)

		rows, err := db.Query(q, args...)
		if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		defer rows.Close()
		list := []Order{}
		for rows.Next() {
			var o Order
			if err := rows.Scan(&o.ID, &o.CustomerID, &o.OrderTS, &o.Status, &o.ItemsTotal, &o.PaidTotal); err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
			o.Outstanding = o.ItemsTotal - o.PaidTotal
			list = append(list, o)
		}
		writeJSON(w, 200, map[string]any{"data": list, "page": page, "page_size": size})
	}
}

func getOrderHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var orderID int64
		if v := r.Context().Value(ctxKeyOrderID{}); v != nil {
			orderID = v.(int64)
		} else {
			id, err := parseIDParam(r, "id")
			if err != nil { writeJSON(w, 400, map[string]string{"error": err.Error()}); return }
			orderID = id
		}

		row := db.QueryRow(`SELECT order_id, customer_id, order_ts, status, COALESCE(extra,'') FROM orders WHERE order_id=?`, orderID)
		var o Order; var extra string
		if err := row.Scan(&o.ID, &o.CustomerID, &o.OrderTS, &o.Status, &extra); err != nil {
			if errors.Is(err, sql.ErrNoRows) { writeJSON(w, 404, map[string]string{"error":"not found"}); return }
			writeJSON(w, 500, map[string]string{"error": err.Error()}); return
		}
		if extra != "" { o.Extra = json.RawMessage(extra) }

		items, err := fetchOrderItems(db, orderID)
		if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		pays, err := fetchPayments(db, orderID)
		if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		totals, err := computeOrderTotals(db, orderID)
		if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		o.Items = items
		o.Payments = pays
		o.ItemsTotal = totals.Items
		o.PaidTotal = totals.Paid
		o.Outstanding = totals.Items - totals.Paid
		writeJSON(w, 200, o)
	}
}

func updateOrderStatusHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		orderID, err := parseIDParam(r, "id")
		if err != nil { writeJSON(w, 400, map[string]string{"error": err.Error()}); return }
		var in struct{ Status string `json:"status"` }
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil { writeJSON(w, 400, map[string]string{"error":"invalid json"}); return }
		in.Status = strings.ToLower(strings.TrimSpace(in.Status))
		switch in.Status {
		case "created", "paid", "refunded", "cancelled":
		default:
			writeJSON(w, 400, map[string]string{"error":"invalid status"}); return
		}
		// if setting to paid, ensure totals covered
		if in.Status == "paid" {
			tot, err := computeOrderTotals(db, orderID)
			if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
			if tot.Paid < tot.Items { writeJSON(w, 400, map[string]string{"error":"cannot set to paid: payments < total"}); return }
		}
		if _, err := db.Exec(`UPDATE orders SET status=? WHERE order_id=?`, in.Status, orderID); err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		getOrderHandler(db)(w, r)
	}
}

func addPaymentHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		orderID, err := parseIDParam(r, "id")
		if err != nil { writeJSON(w, 400, map[string]string{"error": err.Error()}); return }
		var in CreatePaymentIn
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil { writeJSON(w, 400, map[string]string{"error":"invalid json"}); return }
		if in.Amount < 0 { writeJSON(w, 400, map[string]string{"error":"amount must be >=0"}); return }

		tx, err := db.BeginTx(r.Context(), &sql.TxOptions{})
		if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		defer func(){ _ = tx.Rollback() }()

		if _, err := tx.Exec(`INSERT INTO payments(order_id, paid_amount_cents, method) VALUES(?,?,?)`, orderID, in.Amount, in.Method); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()}); return
		}
		if err := autoSetOrderStatusTx(tx, orderID); err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		if err := tx.Commit(); err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		getOrderHandler(db)(w, r)
	}
}

// -------------------------
// Analytics Handlers
// -------------------------

func analyticsDailyGMVHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		from := queryStr(r, "from", "")
		to := queryStr(r, "to", "")
		where := []string{"o.status='paid'"}
		args := []any{}
		if from != "" { where = append(where, "date(o.order_ts) >= date(?)"); args = append(args, from) }
		if to != "" { where = append(where, "date(o.order_ts) <= date(?)"); args = append(args, to) }
		q := `SELECT date(o.order_ts) AS d, COALESCE(SUM(i.qty*i.price_cents_at_sale),0) AS gmv
			FROM orders o JOIN order_items i ON i.order_id=o.order_id
			WHERE ` + strings.Join(where, " AND ") + `
			GROUP BY date(o.order_ts) ORDER BY d`
		rows, err := db.Query(q, args...)
		if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		defer rows.Close()
		var out []map[string]any
		for rows.Next() {
			var d string; var gmv int64
			if err := rows.Scan(&d, &gmv); err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
			out = append(out, map[string]any{"date": d, "gmv_cents": gmv})
		}
		writeJSON(w, 200, map[string]any{"data": out})
	}
}

// -------------------------
// Data access helpers
// -------------------------

type totals struct { Items, Paid int64 }

func computeOrderTotals(db *sql.DB, orderID int64) (totals, error) {
	row := db.QueryRow(`WITH i AS (SELECT COALESCE(SUM(qty*price_cents_at_sale),0) FROM order_items WHERE order_id=?),
		p AS (SELECT COALESCE(SUM(paid_amount_cents),0) FROM payments WHERE order_id=?)
		SELECT (SELECT * FROM i), (SELECT * FROM p)`, orderID, orderID)
	var t totals
	if err := row.Scan(&t.Items, &t.Paid); err != nil { return totals{}, err }
	return t, nil
}

func fetchOrderItems(db *sql.DB, orderID int64) ([]OrderItem, error) {
	rows, err := db.Query(`SELECT order_id, product_id, qty, price_cents_at_sale FROM order_items WHERE order_id=? ORDER BY product_id`, orderID)
	if err != nil { return nil, err }
	defer rows.Close()
	var out []OrderItem
	for rows.Next() {
		var it OrderItem
		if err := rows.Scan(&it.OrderID, &it.ProductID, &it.Qty, &it.PriceAtSale); err != nil { return nil, err }
		out = append(out, it)
	}
	return out, nil
}

func fetchPayments(db *sql.DB, orderID int64) ([]Payment, error) {
	rows, err := db.Query(`SELECT payment_id, order_id, paid_amount_cents, paid_ts, method FROM payments WHERE order_id=? ORDER BY payment_id`, orderID)
	if err != nil { return nil, err }
	defer rows.Close()
	var out []Payment
	for rows.Next() {
		var p Payment
		if err := rows.Scan(&p.ID, &p.OrderID, &p.Amount, &p.PaidTS, &p.Method); err != nil { return nil, err }
		out = append(out, p)
	}
	return out, nil
}

// autoSetOrderStatusTx updates order status to 'paid' if fully covered by payments.
func autoSetOrderStatusTx(tx *sql.Tx, orderID int64) error {
	row := tx.QueryRow(`WITH i AS (SELECT COALESCE(SUM(qty*price_cents_at_sale),0) FROM order_items WHERE order_id=?),
		p AS (SELECT COALESCE(SUM(paid_amount_cents),0) FROM payments WHERE order_id=?)
		SELECT (SELECT * FROM i) <= (SELECT * FROM p)`, orderID, orderID)
	var covered int
	if err := row.Scan(&covered); err != nil { return err }
	if covered == 1 {
		_, err := tx.Exec(`UPDATE orders SET status='paid' WHERE order_id=?`, orderID)
		return err
	}
	return nil
}

func nullIfEmpty(b json.RawMessage) any {
	if len(b) == 0 || string(b) == "null" { return nil }
	return b
}

// -------------------------
// Seed helper (optional)
// -------------------------

func seedHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tx, _ := db.Begin()
		defer func(){ _ = tx.Rollback() }()
		tx.Exec(`DELETE FROM payments`)
		tx.Exec(`DELETE FROM order_items`)
		tx.Exec(`DELETE FROM orders`)
		tx.Exec(`DELETE FROM products`)
		tx.Exec(`DELETE FROM customers`)

		customers := []Customer{{Name:"Alice", Email: ptr("alice@example.com")},{Name:"Bob", Email: ptr("bob@example.com")}}
		for _, c := range customers { tx.Exec(`INSERT INTO customers(name,email) VALUES(?,?)`, c.Name, c.Email) }

		prods := []Product{{Name:"Book A", Category:"图书", PriceCents:1999, CostCents:800}, {Name:"Headphones", Category:"电子", PriceCents:5999, CostCents:3000}}
		for _, p := range prods { tx.Exec(`INSERT INTO products(product_name,category,price_cents,cost_cents) VALUES(?,?,?,?)`, p.Name, p.Category, p.PriceCents, p.CostCents) }

		// Order for Alice: 1x Book A, 1x Headphones, paid partially
		res, _ := tx.Exec(`INSERT INTO orders(customer_id, status) VALUES(?, 'created')`, 1)
		oid, _ := res.LastInsertId()
		tx.Exec(`INSERT INTO order_items(order_id,product_id,qty,price_cents_at_sale) VALUES(?,?,?,?)`, oid, 1, 1, 1999)
		tx.Exec(`INSERT INTO order_items(order_id,product_id,qty,price_cents_at_sale) VALUES(?,?,?,?)`, oid, 2, 1, 5999)
		tx.Exec(`INSERT INTO payments(order_id,paid_amount_cents,method) VALUES(?,?,?)`, oid, 2000, "card")

		// Paid order for Bob
		res, _ = tx.Exec(`INSERT INTO orders(customer_id, status) VALUES(?, 'created')`, 2)
		oid2, _ := res.LastInsertId()
		tx.Exec(`INSERT INTO order_items(order_id,product_id,qty,price_cents_at_sale) VALUES(?,?,?,?)`, oid2, 1, 2, 1999)
		tx.Exec(`INSERT INTO payments(order_id,paid_amount_cents,method) VALUES(?,?,?)`, oid2, 3998, "paypal")
		// auto status
		autoSetOrderStatusTx(tx, oid2)

		if err := tx.Commit(); err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		writeJSON(w, 200, map[string]any{"seeded": true})
	}
}

func ptr[T any](v T) *T { return &v }

type ctxKeyOrderID struct{}
