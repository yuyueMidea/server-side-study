// src-tauri/src/transfer.rs
//
// 核心传输逻辑
//   send_file      — 发送端（主动连接 → 握手 → 发送）
//   start_listener — 接收端（监听 → 每连接一个独立 task）
//   handle_incoming— 处理单个入站连接

use crate::protocol::*;
use bytes::Bytes;
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::Arc,
};
use tauri::{AppHandle, Emitter};
use tokio::{
    fs,
    io::{AsyncReadExt, AsyncWriteExt},
    net::{TcpListener, TcpStream},
    sync::RwLock,
};
use tokio::io::split;
use tokio_util::codec::{FramedRead, FramedWrite};
use futures::{SinkExt, StreamExt};
use uuid::Uuid;

// ─── 错误类型 ─────────────────────────────────────────────────────────────────

#[derive(Debug, thiserror::Error)]
pub enum TransferError {
    #[error("IO 错误: {0}")]
    Io(#[from] std::io::Error),
    #[error("连接失败: {0}")]
    Connection(String),
    #[error("协议错误: {0}")]
    Protocol(String),
    #[error("文件错误: {0}")]
    File(String),
    #[error("校验和不匹配，文件可能损坏")]
    ChecksumMismatch,
}

// Tauri command 要求错误实现 Serialize
impl serde::Serialize for TransferError {
    fn serialize<S>(&self, s: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        s.serialize_str(&self.to_string())
    }
}

// ─── 事件结构体（emit 到前端）────────────────────────────────────────────────

#[derive(Debug, Clone, serde::Serialize)]
pub struct ProgressEvent {
    pub transfer_id:       String,
    pub file_name:         String,
    pub transferred_bytes: u64,
    pub total_bytes:       u64,
    pub percent:           f64,
    pub direction:         String, // "send" | "receive"
    pub status:            String, // "progress" | "complete" | "error"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub speed_bps:         Option<u64>, // 瞬时速度 bytes/s
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ConnectionEvent {
    pub peer_ip:   String,
    pub connected: bool,
    pub peer_id:   String,
}

// ─── 全局状态 ─────────────────────────────────────────────────────────────────

#[derive(Default)]
pub struct TransferState {
    pub active_transfers: HashMap<String, ProgressEvent>,
    pub peer_id:          Option<String>,
    pub is_listening:     bool,
    pub listen_port:      u16,
}

pub type SharedState = Arc<RwLock<TransferState>>;

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/// 流式计算文件 SHA-256（不把整个文件读进内存）
pub async fn compute_checksum(path: &Path) -> Result<String, TransferError> {
    let mut file = fs::File::open(path).await?;
    let mut hasher = Sha256::new();
    let mut buf = vec![0u8; CHUNK_SIZE];
    loop {
        let n = file.read(&mut buf).await?;
        if n == 0 { break; }
        hasher.update(&buf[..n]);
    }
    Ok(hex::encode(hasher.finalize()))
}

/// 从完整路径提取安全文件名
/// Windows: C:\Users\foo\file.txt  → "file.txt"
/// macOS:   /home/foo/file.txt     → "file.txt"
pub fn extract_safe_filename(path: &Path) -> String {
    path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown_file")
        .to_string()
}

/// 构造接收方保存路径，净化文件名防止路径穿越
pub fn build_save_path(download_dir: &Path, file_name: &str) -> PathBuf {
    // 去除所有路径分隔符和 Windows 非法字符
    let safe: String = file_name
        .chars()
        .map(|c| if matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|') { '_' } else { c })
        .collect();
    let safe = if safe.is_empty() { "received_file".to_string() } else { safe };
    download_dir.join(safe)
}

/// 获取 peer_id，不存在则生成
async fn get_or_create_peer_id(state: &SharedState) -> String {
    {
        let r = state.read().await;
        if let Some(id) = &r.peer_id {
            return id.clone();
        }
    }
    let id = Uuid::new_v4().to_string();
    state.write().await.peer_id = Some(id.clone());
    id
}

// ─── 发送端 ──────────────────────────────────────────────────────────────────

/// 主发送流程：连接 → 握手 → 发送文件元信息 → 分块发送 → 完成确认
pub async fn send_file(
    app: AppHandle,
    target_ip: String,
    file_path: PathBuf,
    state: SharedState,
) -> Result<(), TransferError> {
    // 1. 解析目标地址（允许带端口或不带端口）
    let addr = if target_ip.contains(':') {
        target_ip.clone()
    } else {
        format!("{}:{}", target_ip, DEFAULT_PORT)
    };

    // 2. 建立 TCP 连接（5 秒超时）
    let stream = tokio::time::timeout(
        std::time::Duration::from_secs(5),
        TcpStream::connect(&addr),
    )
    .await
    .map_err(|_| TransferError::Connection(format!("连接超时: {}", addr)))?
    .map_err(|e| TransferError::Connection(format!("无法连接 {}: {}", addr, e)))?;

    stream.set_nodelay(true)?;

    let (reader, writer) = split(stream);
    let mut rx = FramedRead::new(reader, FrameCodec);
    let mut tx = FramedWrite::new(writer, FrameCodec);

    // 3. 发送握手
    let my_id = get_or_create_peer_id(&state).await;
    tx.send(Frame::Handshake(HandshakePayload {
        version: PROTOCOL_VERSION,
        peer_id: my_id,
    }))
    .await
    .map_err(|e| TransferError::Protocol(e.to_string()))?;

    // 4. 等待握手回复
    let peer_id = match rx.next().await {
        Some(Ok(Frame::Handshake(p))) => {
            let _ = app.emit("connection_event", ConnectionEvent {
                peer_ip:   target_ip.clone(),
                connected: true,
                peer_id:   p.peer_id.clone(),
            });
            p.peer_id
        }
        Some(Ok(Frame::Error(e))) => return Err(TransferError::Protocol(e.message)),
        Some(Err(e))              => return Err(TransferError::Protocol(e.to_string())),
        None                      => return Err(TransferError::Protocol("对端关闭连接".into())),
        _                         => return Err(TransferError::Protocol("期待握手帧".into())),
    };
    tracing::info!("握手成功 peer={}", peer_id);

    // 5. 读取文件元信息
    let metadata   = fs::metadata(&file_path).await?;
    let file_size  = metadata.len();
    let file_name  = extract_safe_filename(&file_path);
    let transfer_id = Uuid::new_v4().to_string();
    let chunk_count = (file_size + CHUNK_SIZE as u64 - 1) / CHUNK_SIZE as u64;

    // 6. 预计算校验和（流式，不占大内存）
    tracing::info!("计算校验和: {}", file_name);
    let checksum = compute_checksum(&file_path).await?;

    // 7. 发送 FileOffer
    tx.send(Frame::FileOffer(FileOfferPayload {
        transfer_id:  transfer_id.clone(),
        file_name:    file_name.clone(),
        file_size,
        checksum:     checksum.clone(),
        chunk_count,
    }))
    .await
    .map_err(|e| TransferError::Protocol(e.to_string()))?;

    // 8. 等待 FileAccept
    match rx.next().await {
        Some(Ok(Frame::FileAccept(a))) if a.transfer_id == transfer_id => {
            tracing::info!("对端接受文件传输");
        }
        Some(Ok(Frame::Error(e))) => return Err(TransferError::Protocol(e.message)),
        _                         => return Err(TransferError::Protocol("对端拒绝文件".into())),
    }

    // 9. 分块发送
    let mut file             = fs::File::open(&file_path).await?;
    let mut buf              = vec![0u8; CHUNK_SIZE];
    let mut transferred:u64  = 0;
    let mut chunk_index:u64  = 0;
    let start_time           = std::time::Instant::now();
    let mut last_report      = std::time::Instant::now();

    loop {
        let n = file.read(&mut buf).await?;
        if n == 0 { break; }

        let data = Bytes::copy_from_slice(&buf[..n]);
        tx.send(Frame::FileChunk(FileChunk {
            transfer_id:  transfer_id.clone(),
            chunk_index,
            data,
        }))
        .await
        .map_err(|e| TransferError::Protocol(e.to_string()))?;

        transferred  += n as u64;
        chunk_index  += 1;
        let percent   = if file_size > 0 { (transferred as f64 / file_size as f64) * 100.0 } else { 100.0 };

        // 每 100ms 或最后一块上报一次进度
        let now = std::time::Instant::now();
        if now.duration_since(last_report).as_millis() >= 100 || transferred >= file_size {
            let elapsed   = start_time.elapsed().as_secs_f64().max(0.001);
            let speed_bps = (transferred as f64 / elapsed) as u64;
            let _ = app.emit("transfer_progress", ProgressEvent {
                transfer_id:       transfer_id.clone(),
                file_name:         file_name.clone(),
                transferred_bytes: transferred,
                total_bytes:       file_size,
                percent,
                direction:         "send".into(),
                status:            "progress".into(),
                speed_bps:         Some(speed_bps),
            });
            last_report = now;
        }
    }

    // 10. 发送 FileComplete
    tx.send(Frame::FileComplete(FileCompletePayload {
        transfer_id: transfer_id.clone(),
        checksum,
    }))
    .await
    .map_err(|e| TransferError::Protocol(e.to_string()))?;

    // 11. 等待对端确认
    match rx.next().await {
        Some(Ok(Frame::FileComplete(_))) => tracing::info!("传输完成，对端已确认"),
        Some(Ok(Frame::Error(e)))        => {
            return Err(TransferError::Protocol(format!("对端报错: {}", e.message)));
        }
        _ => tracing::warn!("未收到完成确认，文件可能仍已成功传输"),
    }

    // 12. 发送完成事件
    let _ = app.emit("transfer_progress", ProgressEvent {
        transfer_id:       transfer_id.clone(),
        file_name:         file_name.clone(),
        transferred_bytes: file_size,
        total_bytes:       file_size,
        percent:           100.0,
        direction:         "send".into(),
        status:            "complete".into(),
        speed_bps:         None,
    });

    tracing::info!("发送完成: {}", file_name);
    Ok(())
}

// ─── 接收端 ──────────────────────────────────────────────────────────────────

/// 启动 TCP 监听循环，每个连接独立 task 处理
pub async fn start_listener(
    app: AppHandle,
    download_dir: PathBuf,
    state: SharedState,
) -> Result<u16, TransferError> {
    let bind_addr = format!("0.0.0.0:{}", DEFAULT_PORT);
    let listener  = TcpListener::bind(&bind_addr).await.map_err(|e| {
        TransferError::Connection(format!("无法绑定端口 {}: {}", DEFAULT_PORT, e))
    })?;
    let port = listener.local_addr()?.port();

    tracing::info!("监听 {} 端口", port);
    {
        let mut s      = state.write().await;
        s.is_listening = true;
        s.listen_port  = port;
        if s.peer_id.is_none() {
            s.peer_id = Some(Uuid::new_v4().to_string());
        }
    }

    tokio::spawn(async move {
        loop {
            match listener.accept().await {
                Ok((stream, peer_addr)) => {
                    tracing::info!("新连接: {}", peer_addr);
                    let app2  = app.clone();
                    let dir2  = download_dir.clone();
                    let state2 = state.clone();
                    let peer_ip = peer_addr.ip().to_string();
                    tokio::spawn(async move {
                        if let Err(e) = handle_incoming(app2, stream, peer_ip, dir2, state2).await {
                            tracing::error!("处理连接错误: {}", e);
                        }
                    });
                }
                Err(e) => {
                    tracing::error!("accept 错误: {}", e);
                    // 短暂等待后重试，而非崩溃
                    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                }
            }
        }
    });

    Ok(port)
}

/// 处理单个入站连接（接收端完整流程）
async fn handle_incoming(
    app: AppHandle,
    stream: TcpStream,
    peer_ip: String,
    download_dir: PathBuf,
    state: SharedState,
) -> Result<(), TransferError> {
    stream.set_nodelay(true)?;

    let my_id = get_or_create_peer_id(&state).await;
    let (reader, writer) = split(stream);
    let mut rx = FramedRead::new(reader, FrameCodec);
    let mut tx = FramedWrite::new(writer, FrameCodec);

    // 1. 等待握手
    match rx.next().await {
        Some(Ok(Frame::Handshake(p))) => {
            tracing::info!("收到握手 peer={}", p.peer_id);
            // 回复握手
            tx.send(Frame::Handshake(HandshakePayload {
                version: PROTOCOL_VERSION,
                peer_id: my_id,
            }))
            .await
            .map_err(|e| TransferError::Protocol(e.to_string()))?;

            let _ = app.emit("connection_event", ConnectionEvent {
                peer_ip:   peer_ip.clone(),
                connected: true,
                peer_id:   p.peer_id,
            });
        }
        Some(Ok(Frame::Error(e))) => return Err(TransferError::Protocol(e.message)),
        _ => {
            let _ = tx.send(Frame::Error(ErrorPayload {
                code: 400, message: "期待握手帧".into(),
            })).await;
            return Err(TransferError::Protocol("握手失败".into()));
        }
    }

    // 2. 等待 FileOffer
    let offer = match rx.next().await {
        Some(Ok(Frame::FileOffer(o))) => o,
        Some(Ok(Frame::Error(e)))     => return Err(TransferError::Protocol(e.message)),
        _                             => return Err(TransferError::Protocol("未收到 FileOffer".into())),
    };

    tracing::info!("文件请求: {} ({} bytes, {} chunks)",
        offer.file_name, offer.file_size, offer.chunk_count);

    // 通知前端：有文件传入
    let _ = app.emit("file_incoming", serde_json::json!({
        "transfer_id": offer.transfer_id,
        "file_name":   offer.file_name,
        "file_size":   offer.file_size,
        "peer_ip":     peer_ip,
    }));

    // 3. 发送 FileAccept
    tx.send(Frame::FileAccept(FileAcceptPayload {
        transfer_id: offer.transfer_id.clone(),
    }))
    .await
    .map_err(|e| TransferError::Protocol(e.to_string()))?;

    // 4. 创建保存文件（跨平台路径安全）
    let save_path   = build_save_path(&download_dir, &offer.file_name);
    let mut outfile = fs::File::create(&save_path).await
        .map_err(|e| TransferError::File(format!("创建文件失败 {:?}: {}", save_path, e)))?;

    let mut received:  u64    = 0;
    let mut hasher            = Sha256::new();
    let start_time            = std::time::Instant::now();
    let mut last_report       = std::time::Instant::now();

    // 5. 接收数据块循环
    loop {
        match rx.next().await {
            Some(Ok(Frame::FileChunk(chunk))) => {
                if chunk.transfer_id != offer.transfer_id {
                    // 忽略不属于本次传输的 chunk（理论上不会出现）
                    continue;
                }
                // 流式写入 + 流式哈希
                hasher.update(&chunk.data);
                outfile.write_all(&chunk.data).await?;
                received += chunk.data.len() as u64;

                let percent = if offer.file_size > 0 { (received as f64 / offer.file_size as f64 * 100.0).min(100.0) } else { 100.0 };
                let now     = std::time::Instant::now();
                if now.duration_since(last_report).as_millis() >= 100 {
                    let elapsed   = start_time.elapsed().as_secs_f64().max(0.001);
                    let speed_bps = (received as f64 / elapsed) as u64;
                    let _ = app.emit("transfer_progress", ProgressEvent {
                        transfer_id:       offer.transfer_id.clone(),
                        file_name:         offer.file_name.clone(),
                        transferred_bytes: received,
                        total_bytes:       offer.file_size,
                        percent,
                        direction:         "receive".into(),
                        status:            "progress".into(),
                        speed_bps:         Some(speed_bps),
                    });
                    last_report = now;
                }
            }

            Some(Ok(Frame::FileComplete(complete))) => {
                // 6. 确保数据写入磁盘
                outfile.flush().await?;
                drop(outfile); // 关闭文件句柄再校验

                // 7. 校验完整性
                let got_checksum = hex::encode(hasher.finalize());
                if got_checksum != complete.checksum {
                    tracing::error!(
                        "校验和不匹配！期望={} 得到={}", complete.checksum, got_checksum
                    );
                    // 删除损坏文件
                    let _ = fs::remove_file(&save_path).await;
                    let _ = tx.send(Frame::Error(ErrorPayload {
                        code: 500, message: "校验和不匹配，文件已丢弃".into(),
                    })).await;
                    // 通知前端
                    let _ = app.emit("transfer_progress", ProgressEvent {
                        transfer_id:       offer.transfer_id.clone(),
                        file_name:         offer.file_name.clone(),
                        transferred_bytes: received,
                        total_bytes:       offer.file_size,
                        percent:           100.0,
                        direction:         "receive".into(),
                        status:            "error".into(),
                        speed_bps:         None,
                    });
                    return Err(TransferError::ChecksumMismatch);
                }

                // 8. 回复 FileComplete 确认
                let _ = tx.send(Frame::FileComplete(FileCompletePayload {
                    transfer_id: offer.transfer_id.clone(),
                    checksum:    got_checksum,
                })).await;

                tracing::info!("接收完成: {:?}", save_path);

                // 9. 通知前端：完成
                let _ = app.emit("transfer_progress", ProgressEvent {
                    transfer_id:       offer.transfer_id.clone(),
                    file_name:         offer.file_name.clone(),
                    transferred_bytes: offer.file_size,
                    total_bytes:       offer.file_size,
                    percent:           100.0,
                    direction:         "receive".into(),
                    status:            "complete".into(),
                    speed_bps:         None,
                });

                // 10. 通知保存位置
                let _ = app.emit("file_saved", serde_json::json!({
                    "transfer_id": offer.transfer_id,
                    "file_name":   offer.file_name,
                    "save_path":   save_path.to_string_lossy(),
                }));

                break;
            }

            Some(Ok(Frame::Error(e))) => {
                let _ = fs::remove_file(&save_path).await;
                return Err(TransferError::Protocol(format!("对端错误: {}", e.message)));
            }

            None => {
                let _ = fs::remove_file(&save_path).await;
                return Err(TransferError::Protocol("连接意外断开".into()));
            }

            Some(Err(e)) => {
                return Err(TransferError::Protocol(format!("解码错误: {}", e)));
            }

            _ => {} // 忽略 Ping/Pong 等无关帧
        }
    }

    Ok(())
}
