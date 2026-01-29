//! ERP/CRM 客户端 - Tauri 后端
//! 
//! 提供以下功能:
//! - 离线数据缓存 (SQLite)
//! - 数据加密存储 (AES-256-GCM)
//! - 扫码枪对接 (Serial Port)
//! - 数据同步

pub mod commands;
pub mod database;
pub mod scanner;
pub mod storage;
pub mod sync;

use commands::*;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // 认证
            auth_login,
            auth_logout,
            auth_get_current_user,
            // 客户管理
            customer_list,
            customer_get,
            customer_create,
            customer_update,
            customer_delete,
            // 产品管理
            product_list,
            product_get,
            product_get_by_barcode,
            product_create,
            product_update,
            product_delete,
            product_low_stock,
            // 库存操作
            stock_in,
            stock_out,
            stock_adjust,
            // 订单管理
            order_list,
            order_get,
            order_create,
            order_update,
            order_delete,
            order_confirm,
            order_cancel,
            order_complete,
            // 同步
            sync_status,
            sync_start,
            sync_stop,
            sync_force_full,
            // 扫码枪
            scanner_list_ports,
            scanner_connect,
            scanner_disconnect,
            scanner_status,
            scanner_handle_scan,
            // 加密存储
            storage_set_secure,
            storage_get_secure,
            storage_delete_secure,
            storage_clear_secure,
            // 报表
            report_dashboard_stats,
            report_sales,
            report_inventory,
            // 系统
            system_info,
            system_check_update,
            system_clear_cache,
        ])
        .setup(|app| {
            // 初始化日志
            env_logger::init();
            log::info!("ERP/CRM 客户端启动");

            // 获取数据目录
            let data_dir = app.path().app_data_dir().expect("获取数据目录失败");
            std::fs::create_dir_all(&data_dir).ok();
            log::info!("数据目录: {:?}", data_dir);

            // 初始化数据库
            let db_path = data_dir.join("erp_crm.db");
            match database::Database::new(db_path) {
                Ok(_db) => {
                    log::info!("数据库初始化成功");
                    // 可以将 db 存储到 app state 中供后续使用
                }
                Err(e) => {
                    log::error!("数据库初始化失败: {}", e);
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("启动应用失败");
}
