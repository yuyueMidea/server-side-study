// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod system_info;
mod cleaner;

use std::sync::Arc;
use system_info::SystemMonitor;
use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayEvent, Manager};

fn main() {
    // 创建系统托盘
    let quit = CustomMenuItem::new("quit".to_string(), "退出");
    let show = CustomMenuItem::new("show".to_string(), "显示窗口");
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(quit);
    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => {
                let window = app.get_window("main").unwrap();
                window.show().unwrap();
                window.set_focus().unwrap();
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => {
                    std::process::exit(0);
                }
                "show" => {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
                _ => {}
            },
            _ => {}
        })
        .setup(|app| {
            let monitor = Arc::new(SystemMonitor::new());
            app.manage(monitor.clone());

            let window = app.get_window("main").unwrap();
            
            // 启动后台监控任务
            tauri::async_runtime::spawn(async move {
                system_info::start_monitoring(monitor, window).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            system_info::get_current_system_info,
            system_info::get_cpu_history,
            system_info::get_memory_history,
            cleaner::find_large_files,
            cleaner::clean_temp_files,
            cleaner::delete_file,
            cleaner::get_directory_size,
            cleaner::open_file_location,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}