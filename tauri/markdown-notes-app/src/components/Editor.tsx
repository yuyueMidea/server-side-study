import React from 'react';
import { useAppStore } from '../store/useAppStore';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onImageDrop?: (file: File) => void;
}

export const Editor: React.FC<EditorProps> = ({ value, onChange, onImageDrop }) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const { viewMode } = useAppStore();

  // 处理拖拽上传
  const handleDrop = React.useCallback(
    (e: React.DragEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find((file) => file.type.startsWith('image/'));

      if (imageFile && onImageDrop) {
        onImageDrop(imageFile);
      }
    },
    [onImageDrop]
  );

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // 处理 Tab 键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      
      // 设置光标位置
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // 插入文本
  const insertText = React.useCallback(
    (text: string) => {
      if (!textareaRef.current) return;

      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newValue = value.substring(0, start) + text + value.substring(end);
      
      onChange(newValue);
      
      // 设置光标位置
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = start + text.length;
          textareaRef.current.selectionStart = newPosition;
          textareaRef.current.selectionEnd = newPosition;
          textareaRef.current.focus();
        }
      }, 0);
    },
    [value, onChange]
  );

  // 暴露 insertText 方法给父组件
  React.useImperativeHandle(
    React.useRef({ insertText }),
    () => ({ insertText }),
    [insertText]
  );

  if (viewMode === 'preview') {
    return null;
  }

  return (
    <div className={`h-full ${viewMode === 'split' ? 'border-r border-gray-200' : ''}`}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onKeyDown={handleKeyDown}
        className="w-full h-full p-6 resize-none focus:outline-none font-mono text-sm leading-relaxed"
        placeholder="Start writing your markdown here..."
        spellCheck={false}
      />
    </div>
  );
};
