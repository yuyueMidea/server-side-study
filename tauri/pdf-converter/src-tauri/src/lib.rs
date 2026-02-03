use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversionResult {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileData {
    pub name: String,
    pub data: Vec<u8>,
    pub size: u64,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! PDF Converter is ready.", name)
}

#[tauri::command]
fn read_file_binary(path: String) -> Result<FileData, String> {
    let data = fs::read(&path).map_err(|e| e.to_string())?;
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    let name = std::path::Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    
    Ok(FileData {
        name,
        data,
        size: metadata.len(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, read_file_binary])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}