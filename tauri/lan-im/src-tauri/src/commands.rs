use tauri::{AppHandle, Manager, State};
use serde::{Deserialize, Serialize};
use crate::AppState;
use crate::discovery;
use crate::db;

// ── Get local IP ──────────────────────────────────────────────────────────────
#[tauri::command]
pub fn get_local_ip() -> String {
    local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string())
}

// ── Start UDP discovery broadcast ─────────────────────────────────────────────
#[tauri::command]
pub async fn start_discovery(
    app: AppHandle,
    username: String,
) -> Result<(), String> {
    let local_ip = get_local_ip();
    discovery::start_discovery_service(app, username, local_ip)
        .await
        .map_err(|e| e.to_string())
}

// ── Trigger a manual scan (send one broadcast packet) ────────────────────────
#[tauri::command]
pub async fn trigger_scan(app: AppHandle) -> Result<(), String> {
    discovery::trigger_scan(app)
        .await
        .map_err(|e| e.to_string())
}

// ── Send WebRTC signaling payload via UDP ─────────────────────────────────────
#[tauri::command]
pub async fn send_signal(
    target_ip: String,
    target_port: u16,
    payload: String,
) -> Result<(), String> {
    use std::net::UdpSocket;
    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    let addr   = format!("{}:{}", target_ip, target_port);
    socket.send_to(payload.as_bytes(), &addr).map_err(|e| e.to_string())?;
    Ok(())
}

// ── Initialize SQLite database ────────────────────────────────────────────────
#[tauri::command]
pub fn init_db(
    app: AppHandle,
    state: State<AppState>,
) -> Result<(), String> {
    let mut guard = state.db.lock().map_err(|e| e.to_string())?;
    if guard.is_none() {
        let path = app.path()
            .app_data_dir()
            .map_err(|e| e.to_string())?
            .join("lan_im.db");
        let conn = db::open_db(&path).map_err(|e| e.to_string())?;
        *guard = Some(conn);
    }
    Ok(())
}

// ── Save a message to SQLite ──────────────────────────────────────────────────
#[derive(Deserialize)]
pub struct SaveMsgArgs {
    pub peer_id:   String,
    pub msg_id:    String,
    pub from_user: String,
    pub text:      String,
    pub msg_type:  String,
    pub timestamp: i64,
}

#[tauri::command]
pub fn save_message(
    args: SaveMsgArgs,
    state: State<AppState>,
) -> Result<(), String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = guard.as_ref() {
        db::insert_message(conn, &args.peer_id, &args.msg_id, &args.from_user,
                           &args.text, &args.msg_type, args.timestamp)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ── Load messages from SQLite ─────────────────────────────────────────────────
#[derive(Serialize)]
pub struct MsgRow {
    pub msg_id:    String,
    pub from_user: String,
    pub text:      String,
    pub msg_type:  String,
    pub timestamp: i64,
}

#[tauri::command]
pub fn load_messages(
    peer_id: String,
    state: State<AppState>,
) -> Result<Vec<MsgRow>, String> {
    let guard = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = guard.as_ref() {
        let rows = db::fetch_messages(conn, &peer_id)
            .map_err(|e| e.to_string())?;
        return Ok(rows.into_iter().map(|(msg_id, from_user, text, msg_type, timestamp)| {
            MsgRow { msg_id, from_user, text, msg_type, timestamp }
        }).collect());
    }
    Ok(vec![])
}
