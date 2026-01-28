// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use comrak::{markdown_to_html, ComrakOptions};
use printpdf::*;
use base64::{Engine as _, engine::general_purpose};
use chrono::Local;

#[derive(Debug, Serialize, Deserialize)]
struct FileNode {
    name: String,
    path: String,
    is_file: bool,
    children: Option<Vec<FileNode>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct NoteFile {
    path: String,
    content: String,
    name: String,
}

// 读取文件内容
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

// 写入文件内容
#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content)
        .map_err(|e| format!("Failed to write file: {}", e))
}

// 创建新文件
#[tauri::command]
fn create_file(path: String) -> Result<(), String> {
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    fs::write(&path, "# New Note\n\nStart writing...")
        .map_err(|e| format!("Failed to create file: {}", e))
}

// 删除文件
#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    fs::remove_file(&path)
        .map_err(|e| format!("Failed to delete file: {}", e))
}

// 重命名文件
#[tauri::command]
fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path)
        .map_err(|e| format!("Failed to rename file: {}", e))
}

// 列出目录文件
#[tauri::command]
fn list_files(dir_path: String) -> Result<Vec<FileNode>, String> {
    let path = PathBuf::from(&dir_path);
    
    if !path.exists() {
        fs::create_dir_all(&path)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    read_directory(&path)
}

fn read_directory(path: &PathBuf) -> Result<Vec<FileNode>, String> {
    let mut nodes = Vec::new();
    
    let entries = fs::read_dir(path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;
    
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        let name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown")
            .to_string();
        
        // 跳过隐藏文件
        if name.starts_with('.') {
            continue;
        }
        
        let is_file = path.is_file();
        let children = if path.is_dir() {
            Some(read_directory(&path)?)
        } else {
            None
        };
        
        // 只包含 Markdown 文件和目录
        if is_file && !name.ends_with(".md") {
            continue;
        }
        
        nodes.push(FileNode {
            name,
            path: path.to_string_lossy().to_string(),
            is_file,
            children,
        });
    }
    
    // 排序：目录在前，文件在后
    nodes.sort_by(|a, b| {
        if a.is_file == b.is_file {
            a.name.cmp(&b.name)
        } else if a.is_file {
            std::cmp::Ordering::Greater
        } else {
            std::cmp::Ordering::Less
        }
    });
    
    Ok(nodes)
}

// 导出为 HTML
#[tauri::command]
fn export_html(markdown: String, output_path: String) -> Result<(), String> {
    let options = ComrakOptions::default();
    let html = markdown_to_html(&markdown, &options);
    
    let full_html = format!(
        r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exported Note</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
        }}
        code {{
            background-color: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: "Courier New", monospace;
        }}
        pre {{
            background-color: #f4f4f4;
            padding: 1rem;
            border-radius: 5px;
            overflow-x: auto;
        }}
        pre code {{
            background-color: transparent;
            padding: 0;
        }}
        blockquote {{
            border-left: 4px solid #ddd;
            padding-left: 1rem;
            color: #666;
            margin: 1rem 0;
        }}
        img {{
            max-width: 100%;
            height: auto;
        }}
        h1, h2, h3, h4, h5, h6 {{
            margin-top: 1.5rem;
            margin-bottom: 0.5rem;
        }}
    </style>
</head>
<body>
    {}
</body>
</html>"#,
        html
    );
    
    fs::write(&output_path, full_html)
        .map_err(|e| format!("Failed to export HTML: {}", e))
}

// 导出为 PDF (简化版本)
#[tauri::command]
fn export_pdf(markdown: String, output_path: String) -> Result<(), String> {
    // 创建 PDF 文档
    let (doc, page1, layer1) = PdfDocument::new(
        "Markdown Note",
        Mm(210.0),
        Mm(297.0),
        "Layer 1",
    );
    
    let font = doc.add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| format!("Failed to add font: {}", e))?;
    
    let current_layer = doc.get_page(page1).get_layer(layer1);
    
    // 简单文本渲染 (生产环境需要更复杂的排版)
    let lines: Vec<&str> = markdown.lines().collect();
    let mut y_position = 280.0; // 从顶部开始
    
    for line in lines.iter().take(40) { // 限制行数以避免溢出
        if y_position < 20.0 {
            break;
        }
        
        current_layer.use_text(
            line.to_string(),
            12.0,
            Mm(20.0),
            Mm(y_position),
            &font,
        );
        
        y_position -= 7.0;
    }
    
    // 保存 PDF
    doc.save(&mut std::io::BufWriter::new(
        fs::File::create(&output_path)
            .map_err(|e| format!("Failed to create PDF file: {}", e))?
    )).map_err(|e| format!("Failed to save PDF: {}", e))?;
    
    Ok(())
}

// 保存图片 (Base64 -> 文件)
#[tauri::command]
fn save_image(base64_data: String, filename: String, notes_dir: String) -> Result<String, String> {
    // 移除 data URL 前缀
    let base64_clean = if base64_data.contains(",") {
        base64_data.split(",").nth(1).unwrap_or(&base64_data)
    } else {
        &base64_data
    };
    let image_data = general_purpose::STANDARD.decode(base64_clean)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;
    
    // 创建图片目录
    let images_dir = PathBuf::from(&notes_dir).join("images");
    fs::create_dir_all(&images_dir)
        .map_err(|e| format!("Failed to create images directory: {}", e))?;
    
    // 生成唯一文件名
    let timestamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
    let image_path = images_dir.join(format!("{}_{}", timestamp, filename));
    
    fs::write(&image_path, image_data)
        .map_err(|e| format!("Failed to save image: {}", e))?;
    
    Ok(image_path.to_string_lossy().to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            create_file,
            delete_file,
            rename_file,
            list_files,
            export_html,
            export_pdf,
            save_image,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
