import React, { useRef } from 'react';
import useStore from '../store/useStore';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Link, 
  Image as ImageIcon,
  Code,
  Heading1,
  Heading2,
  Quote
} from 'lucide-react';

const Editor = () => {
  const { currentContent, updateContent, currentFile, saveImage } = useStore();
  const textareaRef = useRef(null);

  const insertMarkdown = (before, after = '', placeholder = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = currentContent.substring(start, end);
    const textToInsert = selectedText || placeholder;
    
    const newText = 
      currentContent.substring(0, start) + 
      before + textToInsert + after + 
      currentContent.substring(end);
    
    updateContent(newText);
    
    // 设置新的光标位置
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64 = event.target.result;
        const imagePath = await saveImage(base64, file.name);
        
        // 插入 Markdown 图片语法
        insertMarkdown(`![${file.name}](${imagePath})`, '', '');
      } catch (error) {
        alert('图片上传失败: ' + error);
      }
    };
    reader.readAsDataURL(file);
    
    // 重置 input
    e.target.value = '';
  };

  const toolbarButtons = [
    { icon: Heading1, action: () => insertMarkdown('# ', '', '标题 1'), title: '标题 1' },
    { icon: Heading2, action: () => insertMarkdown('## ', '', '标题 2'), title: '标题 2' },
    { icon: Bold, action: () => insertMarkdown('**', '**', '粗体文字'), title: '粗体' },
    { icon: Italic, action: () => insertMarkdown('*', '*', '斜体文字'), title: '斜体' },
    { icon: Code, action: () => insertMarkdown('`', '`', '代码'), title: '行内代码' },
    { icon: Quote, action: () => insertMarkdown('> ', '', '引用文字'), title: '引用' },
    { icon: List, action: () => insertMarkdown('- ', '', '列表项'), title: '无序列表' },
    { icon: ListOrdered, action: () => insertMarkdown('1. ', '', '列表项'), title: '有序列表' },
    { icon: Link, action: () => insertMarkdown('[', '](url)', '链接文字'), title: '链接' },
  ];

  if (!currentFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <FileText size={64} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">选择或创建一个笔记开始编辑</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* 编辑器工具栏 */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-gray-50">
        {toolbarButtons.map((btn, index) => (
          <button
            key={index}
            onClick={btn.action}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title={btn.title}
          >
            <btn.icon size={18} />
          </button>
        ))}
        
        <div className="h-6 w-px bg-gray-300 mx-2"></div>
        
        <label className="p-2 hover:bg-gray-200 rounded transition-colors cursor-pointer" title="插入图片">
          <ImageIcon size={18} />
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* 编辑器文本区域 */}
      <textarea
        ref={textareaRef}
        value={currentContent}
        onChange={(e) => updateContent(e.target.value)}
        className="editor-textarea"
        placeholder="开始写作..."
        spellCheck="false"
      />
    </div>
  );
};

// 添加 FileText 图标组件 (如果没有导入)
const FileText = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

export default Editor;
