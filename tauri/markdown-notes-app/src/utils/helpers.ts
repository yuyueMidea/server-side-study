import { marked } from 'marked';

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: true,
});

// 将 Markdown 转换为 HTML
export function markdownToHtml(markdown: string): string {
  try {
    return marked(markdown) as string;
  } catch (error) {
    console.error('Error converting markdown to HTML:', error);
    return markdown;
  }
}

// 从 Markdown 中提取标题作为文件名
export function extractTitle(markdown: string): string {
  const lines = markdown.split('\n');
  
  // 查找第一个标题
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      return trimmed.replace(/^#+\s*/, '').trim() || 'Untitled';
    }
  }
  
  // 如果没有标题，使用第一行非空内容
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) {
      return trimmed.substring(0, 50) + (trimmed.length > 50 ? '...' : '');
    }
  }
  
  return 'Untitled';
}

// 生成完整的 HTML 文档
export function generateFullHtml(markdown: string, title: string): string {
  const htmlContent = markdownToHtml(markdown);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
        }
        
        h1 {
            font-size: 2em;
            font-weight: bold;
            margin-top: 0.67em;
            margin-bottom: 0.67em;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 0.3em;
        }
        
        h2 {
            font-size: 1.5em;
            font-weight: bold;
            margin-top: 0.83em;
            margin-bottom: 0.83em;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 0.3em;
        }
        
        h3 {
            font-size: 1.17em;
            font-weight: bold;
            margin-top: 1em;
            margin-bottom: 1em;
        }
        
        p {
            margin: 1em 0;
        }
        
        code {
            background-color: #f3f4f6;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.9em;
            font-family: 'Courier New', Courier, monospace;
        }
        
        pre {
            background-color: #1f2937;
            color: #f9fafb;
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 1em 0;
        }
        
        pre code {
            background: none;
            padding: 0;
            color: inherit;
        }
        
        blockquote {
            border-left: 4px solid #0ea5e9;
            padding-left: 1em;
            color: #6b7280;
            margin: 1em 0;
        }
        
        ul, ol {
            margin: 1em 0;
            padding-left: 2em;
        }
        
        img {
            max-width: 100%;
            height: auto;
            border-radius: 6px;
            margin: 1em 0;
        }
        
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }
        
        th, td {
            border: 1px solid #e5e7eb;
            padding: 8px 12px;
            text-align: left;
        }
        
        th {
            background-color: #f9fafb;
            font-weight: bold;
        }
        
        a {
            color: #0ea5e9;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
}

// 格式化日期
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// 生成唯一 ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}
