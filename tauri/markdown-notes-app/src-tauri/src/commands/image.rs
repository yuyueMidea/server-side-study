use base64::{engine::general_purpose, Engine as _};
use std::fs;
use std::path::Path;

#[tauri::command]
pub async fn save_base64_image(data: String, path: String) -> Result<(), String> {
    let image_data = general_purpose::STANDARD
        .decode(&data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    fs::write(&path, image_data).map_err(|e| format!("Failed to write image: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn copy_image(source_path: String, dest_path: String) -> Result<(), String> {
    fs::copy(&source_path, &dest_path)
        .map_err(|e| format!("Failed to copy image: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn resize_image(
    source_path: String,
    dest_path: String,
    max_width: u32,
    max_height: u32,
) -> Result<(), String> {
    use image::GenericImageView;

    let img = image::open(&source_path).map_err(|e| format!("Failed to open image: {}", e))?;

    let (width, height) = img.dimensions();
    let scale_w = max_width as f32 / width as f32;
    let scale_h = max_height as f32 / height as f32;
    let scale = scale_w.min(scale_h).min(1.0);

    let new_width = (width as f32 * scale) as u32;
    let new_height = (height as f32 * scale) as u32;

    let resized = img.resize(new_width, new_height, image::imageops::FilterType::Lanczos3);

    resized
        .save(&dest_path)
        .map_err(|e| format!("Failed to save resized image: {}", e))?;

    Ok(())
}
