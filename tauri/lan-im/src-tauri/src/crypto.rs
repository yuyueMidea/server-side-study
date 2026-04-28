#![allow(dead_code)]
/**
 * AES-256-GCM encryption for message payloads
 *
 * Key derivation: PBKDF2-like approach using a shared LAN secret.
 * In production, exchange keys via ECDH over the signaling channel.
 */

use aes_gcm::{
    aead::{Aead, KeyInit, OsRng, rand_core::RngCore},
    Aes256Gcm, Key, Nonce,
};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

/// Derive a 32-byte key from a passphrase (simple SHA-256-like mix)
pub fn derive_key(passphrase: &str) -> [u8; 32] {
    let mut key = [0u8; 32];
    let bytes = passphrase.as_bytes();
    for (i, b) in bytes.iter().enumerate() {
        key[i % 32] ^= b.wrapping_mul((i as u8).wrapping_add(1));
    }
    // Simple mixing rounds
    for _ in 0..8 {
        let mut h = DefaultHasher::new();
        key.hash(&mut h);
        let hv = h.finish().to_le_bytes();
        for (i, b) in hv.iter().enumerate() {
            key[i % 32] ^= b;
        }
    }
    key
}

/// Encrypt plaintext, returning nonce || ciphertext (base64)
pub fn encrypt(plaintext: &str, key_bytes: &[u8; 32]) -> Result<String, String> {
    let key    = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);

    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encryption error: {:?}", e))?;

    let mut output = nonce_bytes.to_vec();
    output.extend(ciphertext);
    Ok(base64_encode(&output))
}

/// Decrypt base64 nonce || ciphertext
pub fn decrypt(encoded: &str, key_bytes: &[u8; 32]) -> Result<String, String> {
    let data = base64_decode(encoded).map_err(|e| format!("Base64 error: {}", e))?;
    if data.len() < 12 {
        return Err("Ciphertext too short".into());
    }

    let (nonce_bytes, ciphertext) = data.split_at(12);
    let key    = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce  = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption error: {:?}", e))?;

    String::from_utf8(plaintext).map_err(|e| e.to_string())
}

// Minimal base64 encode/decode (avoids heavy dep)
const B64: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

fn base64_encode(input: &[u8]) -> String {
    let mut out = String::new();
    for chunk in input.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let n  = (b0 << 16) | (b1 << 8) | b2;
        out.push(B64[((n >> 18) & 0x3f) as usize] as char);
        out.push(B64[((n >> 12) & 0x3f) as usize] as char);
        out.push(if chunk.len() > 1 { B64[((n >> 6) & 0x3f) as usize] as char } else { '=' });
        out.push(if chunk.len() > 2 { B64[(n & 0x3f) as usize] as char } else { '=' });
    }
    out
}

fn base64_decode(input: &str) -> Result<Vec<u8>, &'static str> {
    fn val(c: u8) -> Result<u32, &'static str> {
        match c {
            b'A'..=b'Z' => Ok((c - b'A') as u32),
            b'a'..=b'z' => Ok((c - b'a' + 26) as u32),
            b'0'..=b'9' => Ok((c - b'0' + 52) as u32),
            b'+' => Ok(62),
            b'/' => Ok(63),
            b'=' => Ok(0),
            _ => Err("Invalid base64 char"),
        }
    }
    let bytes = input.as_bytes();
    if bytes.len() % 4 != 0 { return Err("Invalid base64 length"); }
    let mut out = Vec::with_capacity(bytes.len() / 4 * 3);
    for chunk in bytes.chunks(4) {
        let v0 = val(chunk[0])?;
        let v1 = val(chunk[1])?;
        let v2 = val(chunk[2])?;
        let v3 = val(chunk[3])?;
        let n  = (v0 << 18) | (v1 << 12) | (v2 << 6) | v3;
        out.push(((n >> 16) & 0xff) as u8);
        if chunk[2] != b'=' { out.push(((n >> 8) & 0xff) as u8); }
        if chunk[3] != b'=' { out.push((n & 0xff) as u8); }
    }
    Ok(out)
}
