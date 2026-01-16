import React, { useState, useEffect } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import Editor from './components/Editor';
import Toolbar from './components/Toolbar';
import Preview from './components/Preview';
import StatusBar from './components/StatusBar';

function App() {
  const [content, setContent] = useState('# 欢迎使用 Markdown 编辑器\n\n开始编写您的文档...\n\n## 功能特性\n\n- **实时预览**：边写边看效果\n- **文件管理**：打开、保存本地文件\n- **导出功能**：支持 HTML、PDF 导出\n- **语法高亮**：代码块自动高亮\n- **主题切换**：明暗主题\n\n```javascript\nfunction hello() {\n  console.log("Hello, Tauri!");\n}\n```\n\n### 任务列表\n\n- [x] 完成基础功能\n- [ ] 添加更多特性\n\n> **提示**：使用工具栏快速插入格式\n\n---\n\n**开始你的创作吧！** 🚀');
  const [currentFile, setCurrentFile] = useState(null);
  const [showPreview, setShowPreview] = useState(true);
  const [theme, setTheme] = useState('light');
  const [zenMode, setZenMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isModified, setIsModified] = useState(false);

  // 应用主题
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // 监听 ESC 键退出禅模式
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && zenMode) {
        setZenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zenMode]);

  // 打开文件
  const handleOpenFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Markdown',
          extensions: ['md', 'markdown', 'txt']
        }]
      });

      if (selected) {
        const fileContent = await readTextFile(selected);
        setContent(fileContent);
        setCurrentFile(selected);
        setIsModified(false);
      }
    } catch (error) {
      console.error('打开文件失败:', error);
    }
  };

  // 保存文件
  const handleSaveFile = async () => {
    try {
      if (currentFile) {
        await writeTextFile(currentFile, content);
        setIsModified(false);
      } else {
        await handleSaveAs();
      }
    } catch (error) {
      console.error('保存文件失败:', error);
    }
  };

  // 另存为
  const handleSaveAs = async () => {
    try {
      const filePath = await save({
        filters: [{
          name: 'Markdown',
          extensions: ['md']
        }]
      });

      if (filePath) {
        await writeTextFile(filePath, content);
        setCurrentFile(filePath);
        setIsModified(false);
      }
    } catch (error) {
      console.error('另存为失败:', error);
    }
  };

  // 导出 HTML
  const handleExportHTML = async () => {
    try {
      const filePath = await save({
        filters: [{
          name: 'HTML',
          extensions: ['html']
        }]
      });

      if (filePath) {
        const html = generateHTML(content);
        await writeTextFile(filePath, html);
      }
    } catch (error) {
      console.error('导出 HTML 失败:', error);
    }
  };

  const generateHTML = (markdown) => {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Document</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background: #2d2d2d; padding: 20px; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #3b82f6; padding-left: 16px; color: #666; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background: #f4f4f4; }
  </style>
</head>
<body>
  ${markdown}
</body>
</html>`;
  };

  const handleContentChange = (newContent) => {
    setContent(newContent);
    setIsModified(true);
  };

  return (
    <div className={`h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white overflow-hidden">
        {!zenMode && (
          <Toolbar
            onOpenFile={handleOpenFile}
            onSaveFile={handleSaveFile}
            onSaveAs={handleSaveAs}
            onExportHTML={handleExportHTML}
            showPreview={showPreview}
            onTogglePreview={() => setShowPreview(!showPreview)}
            theme={theme}
            onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            zenMode={zenMode}
            onToggleZen={() => setZenMode(!zenMode)}
            showSearch={showSearch}
            onToggleSearch={() => setShowSearch(!showSearch)}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            content={content}
            onContentChange={handleContentChange}
            isModified={isModified}
          />
        )}

        <div className="flex-1 flex overflow-hidden">
          <Editor
            content={content}
            onChange={handleContentChange}
            showPreview={showPreview}
            searchTerm={searchTerm}
            theme={theme}
          />
          {showPreview && (
            <Preview
              content={content}
              theme={theme}
            />
          )}
        </div>

        {!zenMode && (
          <StatusBar
            content={content}
            currentFile={currentFile}
            isModified={isModified}
            theme={theme}
          />
        )}

        {zenMode && (
          <div className="fixed bottom-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg text-sm backdrop-blur-sm">
            按 ESC 退出无干扰模式
          </div>
        )}
      </div>
    </div>
  );
}

export default App;