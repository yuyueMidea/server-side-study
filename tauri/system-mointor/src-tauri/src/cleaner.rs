use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LargeFile {
    pub path: String,
    pub size: u64,
    pub size_formatted: String,
    pub extension: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupResult {
    pub files_removed: usize,
    pub space_freed: u64,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgress {
    pub current_path: String,
    pub files_scanned: usize,
}

fn format_size(size: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if size >= GB {
        format!("{:.2} GB", size as f64 / GB as f64)
    } else if size >= MB {
        format!("{:.2} MB", size as f64 / MB as f64)
    } else if size >= KB {
        format!("{:.2} KB", size as f64 / KB as f64)
    } else {
        format!("{} B", size)
    }
}

#[tauri::command]
pub async fn find_large_files(
    path: String,
    min_size_mb: u64,
    window: tauri::Window,
) -> Result<Vec<LargeFile>, String> {
    let min_size = min_size_mb * 1024 * 1024;
    let mut large_files = Vec::new();
    let mut files_scanned = 0;

    for entry in WalkDir::new(&path)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            files_scanned += 1;

            if files_scanned % 100 == 0 {
                let _ = window.emit("scan-progress", ScanProgress {
                    current_path: entry.path().display().to_string(),
                    files_scanned,
                });
            }

            if let Ok(metadata) = entry.metadata() {
                let size = metadata.len();
                if size >= min_size {
                    let path_str = entry.path().display().to_string();
                    let extension = entry
                        .path()
                        .extension()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string();

                    large_files.push(LargeFile {
                        path: path_str,
                        size,
                        size_formatted: format_size(size),
                        extension,
                    });
                }
            }
        }
    }

    // 按大小降序排序
    large_files.sort_by(|a, b| b.size.cmp(&a.size));

    Ok(large_files)
}

#[tauri::command]
pub async fn clean_temp_files() -> Result<CleanupResult, String> {
    let mut result = CleanupResult {
        files_removed: 0,
        space_freed: 0,
        errors: Vec::new(),
    };

    // 获取临时文件夹路径
    let temp_paths = get_temp_directories();

    for temp_path in temp_paths {
        if let Err(e) = clean_directory(&temp_path, &mut result) {
            result.errors.push(format!("清理 {} 失败: {}", temp_path.display(), e));
        }
    }

    Ok(result)
}

fn get_temp_directories() -> Vec<PathBuf> {
    let mut paths = Vec::new();

    // Windows 临时目录
    #[cfg(target_os = "windows")]
    {
        if let Ok(temp) = std::env::var("TEMP") {
            paths.push(PathBuf::from(temp));
        }
        if let Ok(tmp) = std::env::var("TMP") {
            paths.push(PathBuf::from(tmp));
        }
        // Windows 预取文件
        paths.push(PathBuf::from("C:\\Windows\\Prefetch"));
    }

    // Linux/macOS 临时目录
    #[cfg(not(target_os = "windows"))]
    {
        paths.push(PathBuf::from("/tmp"));
        if let Ok(home) = std::env::var("HOME") {
            paths.push(PathBuf::from(format!("{}/.cache", home)));
        }
    }

    paths
}

fn clean_directory(path: &Path, result: &mut CleanupResult) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }

    for entry in WalkDir::new(path)
        .max_depth(2)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            if let Ok(metadata) = entry.metadata() {
                let size = metadata.len();
                
                match fs::remove_file(entry.path()) {
                    Ok(_) => {
                        result.files_removed += 1;
                        result.space_freed += size;
                    }
                    Err(e) => {
                        // 忽略正在使用的文件
                        if e.kind() != std::io::ErrorKind::PermissionDenied {
                            result.errors.push(format!(
                                "无法删除 {}: {}",
                                entry.path().display(),
                                e
                            ));
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn delete_file(path: String) -> Result<bool, String> {
    match fs::remove_file(&path) {
        Ok(_) => Ok(true),
        Err(e) => Err(format!("删除文件失败: {}", e)),
    }
}

#[tauri::command]
pub async fn get_directory_size(path: String) -> Result<u64, String> {
    let mut total_size = 0u64;

    for entry in WalkDir::new(&path)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            if let Ok(metadata) = entry.metadata() {
                total_size += metadata.len();
            }
        }
    }

    Ok(total_size)
}

#[tauri::command]
pub async fn open_file_location(path: String) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    let _parent = path_buf
        .parent()
        .ok_or("无法获取父目录")?;

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("打开文件位置失败: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("打开文件位置失败: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(_parent)
            .spawn()
            .map_err(|e| format!("打开文件位置失败: {}", e))?;
    }

    Ok(())
}