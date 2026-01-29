//! SQLite 数据库模块 - 离线数据缓存

use rusqlite::{Connection, Result as SqliteResult, params};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use chrono::Utc;
use serde::{Deserialize, Serialize};

/// 数据库管理器
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    /// 创建新的数据库连接
    pub fn new(db_path: PathBuf) -> SqliteResult<Self> {
        let conn = Connection::open(&db_path)?;
        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        db.init_tables()?;
        Ok(db)
    }

    /// 初始化数据库表
    fn init_tables(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        
        // 客户表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS customers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                company TEXT,
                email TEXT,
                phone TEXT,
                address TEXT,
                category TEXT,
                status TEXT DEFAULT 'active',
                contact_person TEXT,
                credit_limit REAL DEFAULT 0,
                balance REAL DEFAULT 0,
                remark TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                synced INTEGER DEFAULT 0
            )",
            [],
        )?;

        // 产品表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                barcode TEXT,
                name TEXT NOT NULL,
                category TEXT,
                unit TEXT,
                specification TEXT,
                brand TEXT,
                cost_price REAL DEFAULT 0,
                sell_price REAL DEFAULT 0,
                min_stock INTEGER DEFAULT 0,
                max_stock INTEGER DEFAULT 0,
                current_stock INTEGER DEFAULT 0,
                warehouse_id TEXT,
                location TEXT,
                status TEXT DEFAULT 'active',
                description TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                synced INTEGER DEFAULT 0
            )",
            [],
        )?;

        // 订单表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                type TEXT NOT NULL,
                customer_id TEXT,
                customer_name TEXT,
                status TEXT DEFAULT 'draft',
                total_quantity INTEGER DEFAULT 0,
                total_amount REAL DEFAULT 0,
                discount_amount REAL DEFAULT 0,
                payable_amount REAL DEFAULT 0,
                paid_amount REAL DEFAULT 0,
                delivery_address TEXT,
                delivery_date TEXT,
                remark TEXT,
                operator_id TEXT,
                operator_name TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                synced INTEGER DEFAULT 0
            )",
            [],
        )?;

        // 订单明细表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS order_items (
                id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL,
                product_id TEXT,
                product_name TEXT,
                product_code TEXT,
                unit TEXT,
                quantity INTEGER DEFAULT 0,
                unit_price REAL DEFAULT 0,
                discount REAL DEFAULT 0,
                amount REAL DEFAULT 0,
                remark TEXT,
                FOREIGN KEY (order_id) REFERENCES orders(id)
            )",
            [],
        )?;

        // 库存记录表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS stock_records (
                id TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                before_quantity INTEGER,
                after_quantity INTEGER,
                unit_price REAL DEFAULT 0,
                total_amount REAL DEFAULT 0,
                related_order_id TEXT,
                warehouse_id TEXT,
                operator_id TEXT,
                operator_name TEXT,
                remark TEXT,
                created_at TEXT NOT NULL,
                synced INTEGER DEFAULT 0
            )",
            [],
        )?;

        // 同步队列表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS sync_queue (
                id TEXT PRIMARY KEY,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                operation TEXT NOT NULL,
                data TEXT,
                retry_count INTEGER DEFAULT 0,
                error_message TEXT,
                created_at TEXT NOT NULL
            )",
            [],
        )?;

        // 创建索引
        conn.execute("CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(code)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id)", [])?;

        Ok(())
    }

    /// 获取连接引用
    pub fn get_conn(&self) -> Arc<Mutex<Connection>> {
        Arc::clone(&self.conn)
    }
}

/// 同步队列项
#[derive(Debug, Serialize, Deserialize)]
pub struct SyncQueueItem {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub data: Option<String>,
    pub retry_count: i32,
    pub error_message: Option<String>,
    pub created_at: String,
}

impl Database {
    /// 添加同步队列项
    pub fn add_to_sync_queue(
        &self,
        entity_type: &str,
        entity_id: &str,
        operation: &str,
        data: Option<&str>,
    ) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        let id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO sync_queue (id, entity_type, entity_id, operation, data, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, entity_type, entity_id, operation, data, now],
        )?;

        Ok(())
    }

    /// 获取待同步项
    pub fn get_pending_sync_items(&self, limit: i32) -> SqliteResult<Vec<SyncQueueItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, entity_type, entity_id, operation, data, retry_count, error_message, created_at
             FROM sync_queue
             WHERE retry_count < 5
             ORDER BY created_at ASC
             LIMIT ?1"
        )?;

        let items = stmt.query_map([limit], |row| {
            Ok(SyncQueueItem {
                id: row.get(0)?,
                entity_type: row.get(1)?,
                entity_id: row.get(2)?,
                operation: row.get(3)?,
                data: row.get(4)?,
                retry_count: row.get(5)?,
                error_message: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?.collect::<SqliteResult<Vec<_>>>()?;

        Ok(items)
    }

    /// 删除同步队列项
    pub fn remove_from_sync_queue(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM sync_queue WHERE id = ?1", [id])?;
        Ok(())
    }

    /// 更新同步队列项错误
    pub fn update_sync_error(&self, id: &str, error: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE sync_queue SET retry_count = retry_count + 1, error_message = ?1 WHERE id = ?2",
            params![error, id],
        )?;
        Ok(())
    }

    /// 获取待同步数量
    pub fn get_pending_sync_count(&self) -> SqliteResult<i64> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM sync_queue WHERE retry_count < 5",
            [],
            |row| row.get(0),
        )?;
        Ok(count)
    }
}
