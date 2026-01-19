use rusqlite::{Connection, Result};
use std::path::Path;

pub struct DbState {
    pub path: String,
}

pub fn get_connection(db_path: &str) -> Result<Connection> {
    Connection::open(db_path)
}

pub fn init_database(db_path: &Path) -> Result<()> {
    let conn = Connection::open(db_path)?;
    
    // 创建客户表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            address TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    
    // 创建合同表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contract_no TEXT NOT NULL UNIQUE,
            customer_name TEXT NOT NULL,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            status TEXT NOT NULL,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    
    // 创建设备表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS equipment (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_no TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            model TEXT,
            manufacturer TEXT,
            purchase_date TEXT NOT NULL,
            price REAL NOT NULL,
            location TEXT NOT NULL,
            status TEXT NOT NULL,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    
    Ok(())
}