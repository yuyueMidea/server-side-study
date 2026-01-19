// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod models;
mod commands;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("无法获取应用数据目录");
            std::fs::create_dir_all(&app_data_dir).expect("无法创建应用数据目录");
            
            let db_path = app_data_dir.join("data.db");
            database::init_database(&db_path).expect("数据库初始化失败");
            
            // 将数据库路径存储到应用状态
            app.manage(database::DbState {
                path: db_path.to_str().unwrap().to_string(),
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_all_customers,
            commands::create_customer,
            commands::update_customer,
            commands::delete_customer,
            commands::get_all_contracts,
            commands::create_contract,
            commands::update_contract,
            commands::delete_contract,
            commands::get_all_equipment,
            commands::create_equipment,
            commands::update_equipment,
            commands::delete_equipment,
        ])
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用时出错");
}