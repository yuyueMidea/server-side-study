use pulldown_cmark::{html, Options, Parser};
use std::fs;
use std::path::Path;

#[tauri::command]
pub async fn export_to_html(content: String, file_path: String) -> Result<(), String> {
    let html_content = markdown_to_html(&content);
    
    let full_html = format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exported Document</title>
    <style>
        body {{
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
        }}
        
        h1 {{
            font-size: 2em;
            font-weight: bold;
            margin-top: 0.67em;
            margin-bottom: 0.67em;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 0.3em;
        }}
        
        h2 {{
            font-size: 1.5em;
            font-weight: bold;
            margin-top: 0.83em;
            margin-bottom: 0.83em;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 0.3em;
        }}
        
        h3 {{
            font-size: 1.17em;
            font-weight: bold;
            margin-top: 1em;
            margin-bottom: 1em;
        }}
        
        p {{
            margin: 1em 0;
        }}
        
        code {{
            background-color: #f3f4f6;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.9em;
            font-family: 'Courier New', Courier, monospace;
        }}
        
        pre {{
            background-color: #1f2937;
            color: #f9fafb;
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 1em 0;
        }}
        
        pre code {{
            background: none;
            padding: 0;
            color: inherit;
        }}
        
        blockquote {{
            border-left: 4px solid #0ea5e9;
            padding-left: 1em;
            color: #6b7280;
            margin: 1em 0;
        }}
        
        ul, ol {{
            margin: 1em 0;
            padding-left: 2em;
        }}
        
        img {{
            max-width: 100%;
            height: auto;
            border-radius: 6px;
            margin: 1em 0;
        }}
        
        table {{
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }}
        
        th, td {{
            border: 1px solid #e5e7eb;
            padding: 8px 12px;
            text-align: left;
        }}
        
        th {{
            background-color: #f9fafb;
            font-weight: bold;
        }}
        
        a {{
            color: #0ea5e9;
            text-decoration: none;
        }}
        
        a:hover {{
            text-decoration: underline;
        }}
    </style>
</head>
<body>
    {}
</body>
</html>"#,
        html_content
    );

    fs::write(file_path, full_html).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn export_to_pdf(content: String, file_path: String) -> Result<(), String> {
    // 注意：PDF 导出需要额外的依赖（如 headless_chrome 或 wkhtmltopdf）
    // 这里先导出为 HTML，实际应用中需要使用 PDF 生成库
    
    // 简化版本：先导出为 HTML，提示用户使用浏览器打印为 PDF
    let html_path = file_path.replace(".pdf", "_temp.html");
    export_to_html(content, html_path.clone()).await?;
    
    // 实际应用中，这里应该调用 PDF 生成库
    // 例如使用 headless_chrome 或者调用系统的 wkhtmltopdf
    
    Err("PDF export requires manual printing from browser. HTML file created instead.".to_string())
}

fn markdown_to_html(markdown: &str) -> String {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_FOOTNOTES);

    let parser = Parser::new_ext(markdown, options);
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);
    html_output
}
