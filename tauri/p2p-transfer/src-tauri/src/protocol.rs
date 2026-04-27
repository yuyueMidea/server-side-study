// src-tauri/src/protocol.rs
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │  P2P Transfer — 自定义二进制协议 v1                                      │
// │                                                                         │
// │  帧格式（所有整数均为小端序）：                                            │
// │                                                                         │
// │   ┌──────────┬────────────┬──────────────────────────┐                  │
// │   │ type(4B) │ length(8B) │ payload(N bytes)          │                  │
// │   └──────────┴────────────┴──────────────────────────┘                  │
// │                                                                         │
// │  非 FileChunk 帧：payload = UTF-8 JSON                                   │
// │  FileChunk 帧：payload = chunk_index(8B) + transfer_id_len(2B) +        │
// │                          transfer_id(N B) + raw_bytes                   │
// │  → 完全避免 base64，节省 33% 带宽                                         │
// └─────────────────────────────────────────────────────────────────────────┘

use bytes::{Buf, BufMut, Bytes, BytesMut};
use serde::{Deserialize, Serialize};
use std::io;
use tokio_util::codec::{Decoder, Encoder};

pub const PROTOCOL_VERSION: u8 = 1;
pub const DEFAULT_PORT: u16 = 55001;
pub const CHUNK_SIZE: usize = 256 * 1024; // 256 KB per chunk（适合局域网）

// ─── 帧类型常量 ───────────────────────────────────────────────────────────────

pub const FRAME_HANDSHAKE:     u32 = 0x01;
pub const FRAME_FILE_OFFER:    u32 = 0x02;
pub const FRAME_FILE_ACCEPT:   u32 = 0x03;
pub const FRAME_FILE_CHUNK:    u32 = 0x04; // 特殊：二进制 payload
pub const FRAME_FILE_COMPLETE: u32 = 0x05;
pub const FRAME_ERROR:         u32 = 0x06;
pub const FRAME_PING:          u32 = 0x07;
pub const FRAME_PONG:          u32 = 0x08;

// ─── JSON Payload 结构体 ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HandshakePayload {
    pub version: u8,
    pub peer_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileOfferPayload {
    pub transfer_id: String,
    /// 仅文件名，不含路径（跨平台安全）
    pub file_name: String,
    pub file_size: u64,
    /// SHA-256 hex 校验和（发送前预计算）
    pub checksum: String,
    pub chunk_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileAcceptPayload {
    pub transfer_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileCompletePayload {
    pub transfer_id: String,
    pub checksum: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorPayload {
    pub code: u32,
    pub message: String,
}

// ─── 帧枚举 ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct FileChunk {
    pub transfer_id: String,
    pub chunk_index: u64,
    pub data: Bytes, // 使用 Bytes 避免不必要克隆
}

#[derive(Debug, Clone)]
pub enum Frame {
    Handshake(HandshakePayload),
    FileOffer(FileOfferPayload),
    FileAccept(FileAcceptPayload),
    FileChunk(FileChunk),
    FileComplete(FileCompletePayload),
    Error(ErrorPayload),
    Ping,
    Pong,
}

// ─── Tokio Codec ─────────────────────────────────────────────────────────────

pub struct FrameCodec;

impl Encoder<Frame> for FrameCodec {
    type Error = io::Error;

    fn encode(&mut self, frame: Frame, dst: &mut BytesMut) -> Result<(), Self::Error> {
        match frame {
            // FileChunk 使用特殊二进制编码（零拷贝设计）
            Frame::FileChunk(chunk) => {
                let id_bytes = chunk.transfer_id.as_bytes();
                // payload = chunk_index(8) + id_len(2) + id + data
                let payload_len = 8 + 2 + id_bytes.len() + chunk.data.len();

                dst.reserve(12 + payload_len);
                dst.put_u32_le(FRAME_FILE_CHUNK);
                dst.put_u64_le(payload_len as u64);
                dst.put_u64_le(chunk.chunk_index);
                dst.put_u16_le(id_bytes.len() as u16);
                dst.put_slice(id_bytes);
                dst.put_slice(&chunk.data);
            }
            // 其余帧使用 JSON payload
            other => {
                let (type_id, payload) = encode_json_frame(&other)?;
                dst.reserve(12 + payload.len());
                dst.put_u32_le(type_id);
                dst.put_u64_le(payload.len() as u64);
                dst.put_slice(&payload);
            }
        }
        Ok(())
    }
}

fn encode_json_frame(frame: &Frame) -> io::Result<(u32, Vec<u8>)> {
    fn to_json<T: Serialize>(v: &T) -> io::Result<Vec<u8>> {
        serde_json::to_vec(v).map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))
    }
    match frame {
        Frame::Handshake(p)    => Ok((FRAME_HANDSHAKE,     to_json(p)?)),
        Frame::FileOffer(p)    => Ok((FRAME_FILE_OFFER,    to_json(p)?)),
        Frame::FileAccept(p)   => Ok((FRAME_FILE_ACCEPT,   to_json(p)?)),
        Frame::FileComplete(p) => Ok((FRAME_FILE_COMPLETE, to_json(p)?)),
        Frame::Error(p)        => Ok((FRAME_ERROR,         to_json(p)?)),
        Frame::Ping            => Ok((FRAME_PING,          vec![])),
        Frame::Pong            => Ok((FRAME_PONG,          vec![])),
        Frame::FileChunk(_)    => unreachable!("FileChunk handled separately"),
    }
}

impl Decoder for FrameCodec {
    type Item = Frame;
    type Error = io::Error;

    fn decode(&mut self, src: &mut BytesMut) -> Result<Option<Self::Item>, Self::Error> {
        const HEADER: usize = 12; // 4 (type) + 8 (len)

        if src.len() < HEADER {
            src.reserve(HEADER);
            return Ok(None);
        }

        let frame_type   = u32::from_le_bytes(src[0..4].try_into().unwrap());
        let payload_len  = u64::from_le_bytes(src[4..12].try_into().unwrap()) as usize;

        // 安全限制：单帧最大 512 MB
        const MAX_FRAME: usize = 512 * 1024 * 1024;
        if payload_len > MAX_FRAME {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!("帧过大: {} bytes (max {})", payload_len, MAX_FRAME),
            ));
        }

        let total = HEADER + payload_len;
        if src.len() < total {
            src.reserve(total - src.len());
            return Ok(None);
        }

        src.advance(HEADER);
        let payload = src.split_to(payload_len).freeze();

        let frame = decode_frame(frame_type, payload)?;
        Ok(Some(frame))
    }
}

fn decode_frame(frame_type: u32, mut payload: Bytes) -> io::Result<Frame> {
    match frame_type {
        FRAME_HANDSHAKE => {
            let p = json_parse::<HandshakePayload>(&payload)?;
            Ok(Frame::Handshake(p))
        }
        FRAME_FILE_OFFER => {
            let p = json_parse::<FileOfferPayload>(&payload)?;
            Ok(Frame::FileOffer(p))
        }
        FRAME_FILE_ACCEPT => {
            let p = json_parse::<FileAcceptPayload>(&payload)?;
            Ok(Frame::FileAccept(p))
        }
        // FileChunk: 二进制解码
        FRAME_FILE_CHUNK => {
            if payload.len() < 10 {
                return Err(io::Error::new(io::ErrorKind::InvalidData, "FileChunk payload 太短"));
            }
            let chunk_index = payload.get_u64_le();
            let id_len = payload.get_u16_le() as usize;
            if payload.len() < id_len {
                return Err(io::Error::new(io::ErrorKind::InvalidData, "transfer_id 截断"));
            }
            let id_bytes = payload.split_to(id_len);
            let transfer_id = String::from_utf8(id_bytes.to_vec())
                .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;
            // 剩余 payload 即为原始文件数据
            Ok(Frame::FileChunk(FileChunk {
                transfer_id,
                chunk_index,
                data: payload, // 零拷贝
            }))
        }
        FRAME_FILE_COMPLETE => {
            let p = json_parse::<FileCompletePayload>(&payload)?;
            Ok(Frame::FileComplete(p))
        }
        FRAME_ERROR => {
            let p = json_parse::<ErrorPayload>(&payload)?;
            Ok(Frame::Error(p))
        }
        FRAME_PING => Ok(Frame::Ping),
        FRAME_PONG => Ok(Frame::Pong),
        _ => Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("未知帧类型: 0x{:02X}", frame_type),
        )),
    }
}

fn json_parse<T: for<'de> Deserialize<'de>>(data: &[u8]) -> io::Result<T> {
    serde_json::from_slice(data).map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))
}
