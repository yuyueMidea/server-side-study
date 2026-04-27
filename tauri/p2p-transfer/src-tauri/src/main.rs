// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod protocol;
mod transfer;

use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::RwLock;
use transfer::{SharedState, TransferError, TransferState};

// ─── 全局托管状态 ─────────────────────────────────────────────────────────────

struct AppState {
    transfer: SharedState,
}

// ─── Tauri 命令 ───────────────────────────────────────────────────────────────

/// 发送文件到指定 IP
#[tauri::command]
async fn send_file(
    app: AppHandle,
    target_ip: String,
    file_path: String,
    state: State<'_, AppState>,
) -> Result<(), TransferError> {
    let path = std::path::PathBuf::from(&file_path);
    if !path.exists() {
        return Err(TransferError::File(format!("文件不存在: {}", file_path)));
    }
    if !path.is_file() {
        return Err(TransferError::File("只支持发送文件（不支持目录）".into()));
    }
    transfer::send_file(app, target_ip, path, state.transfer.clone()).await
}

/// 手动启动监听（已在 setup 中自动调用，此命令供前端重试）
#[tauri::command]
async fn start_listening(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<u16, TransferError> {
    let download_dir = app
        .path()
        .download_dir()
        .map_err(|e| TransferError::File(format!("无法获取下载目录: {}", e)))?;
    transfer::start_listener(app.clone(), download_dir, state.transfer.clone()).await
}

/// 获取本机局域网 IPv4 地址列表
#[tauri::command]
async fn get_local_ips() -> Vec<String> {
    let mut ips = Vec::new();

    // 方法1：枚举网络接口（get-if-addrs crate，跨平台）
    if let Ok(interfaces) = get_if_addrs::get_if_addrs() {
        for iface in interfaces {
            if let std::net::IpAddr::V4(v4) = iface.addr.ip() {
                if !v4.is_loopback() && !v4.is_link_local() {
                    ips.push(v4.to_string());
                }
            }
        }
    }

    // 方法2 fallback：UDP 探测（不实际发包，仅获取路由出口 IP）
    if ips.is_empty() {
        if let Ok(sock) = std::net::UdpSocket::bind("0.0.0.0:0") {
            if sock.connect("8.8.8.8:80").is_ok() {
                if let Ok(addr) = sock.local_addr() {
                    ips.push(addr.ip().to_string());
                }
            }
        }
    }

    ips
}

/// 获取应用当前状态（供前端轮询或初始化使用）
#[tauri::command]
async fn get_app_status(state: State<'_, AppState>) -> Result<serde_json::Value, ()> {
    let s = state.transfer.read().await;
    Ok(serde_json::json!({
        "is_listening":     s.is_listening,
        "listen_port":      s.listen_port,
        "peer_id":          s.peer_id,
        "active_transfers": s.active_transfers.len(),
    }))
}

/// 获取文件元信息（真实大小、名称），供前端在选择文件后展示
#[tauri::command]
async fn get_file_meta(file_path: String) -> Result<serde_json::Value, String> {
    let path = std::path::Path::new(&file_path);
    if !path.exists() {
        return Err(format!("路径不存在: {}", file_path));
    }
    let meta = std::fs::metadata(path).map_err(|e| e.to_string())?;
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    Ok(serde_json::json!({
        "name":    name,
        "size":    meta.len(),
        "is_file": meta.is_file(),
    }))
}

/// 用系统默认文件管理器打开下载目录（跨平台）
#[tauri::command]
async fn open_download_dir(app: AppHandle) -> Result<(), String> {
    let dir = app
        .path()
        .download_dir()
        .map_err(|e| e.to_string())?;
    let dir_str = dir.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&dir_str)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&dir_str)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&dir_str)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

// ─── 主入口 ──────────────────────────────────────────────────────────────────

fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "p2p_transfer=debug,warn".into()),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            transfer: Arc::new(RwLock::new(TransferState::default())),
        })
        .invoke_handler(tauri::generate_handler![
            send_file,
            start_listening,
            get_local_ips,
            get_app_status,
            get_file_meta,
            open_download_dir,
        ])
        .setup(|app| {
            let handle         = app.handle().clone();
            let transfer_state = app.state::<AppState>().transfer.clone();

            tauri::async_runtime::spawn(async move {
                let download_dir = match handle.path().download_dir() {
                    Ok(d)  => d,
                    Err(e) => {
                        tracing::error!("无法获取下载目录: {}", e);
                        let _ = handle.emit("app_error", format!("无法获取下载目录: {}", e));
                        return;
                    }
                };

                match transfer::start_listener(handle.clone(), download_dir, transfer_state).await {
                    Ok(port) => {
                        tracing::info!("监听启动成功，端口: {}", port);
                        let _ = handle.emit("listener_ready", serde_json::json!({
                            "port": port, "status": "listening",
                        }));
                    }
                    Err(e) => {
                        tracing::error!("监听启动失败: {}", e);
                        let _ = handle.emit("listener_ready", serde_json::json!({
                            "port": 0, "status": "error", "message": e.to_string(),
                        }));
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Tauri 启动失败");
}
