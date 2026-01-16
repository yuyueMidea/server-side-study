import React, { useRef, useEffect, useState } from 'react';

function Editor({ content, onChange, showPreview, searchTerm, theme }) {
    const textareaRef = useRef(null);
    const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

    const updateCursorPosition = () => {
        if (!textareaRef.current) return;
        const pos = textareaRef.current.selectionStart;
        const text = content.substring(0, pos);
        const lines = text.split('\n');
        setCursorPos({
            line: lines.length,
            col: lines[lines.length - 1].length + 1
        });
    };

    const handleKeyDown = (e) => {
        // Tab 键插入空格
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const newContent = content.substring(0, start) + '  ' + content.substring(end);
            onChange(newContent);
            setTimeout(() => {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
            }, 0);
        }

        // Ctrl+S 保存
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            // 触发保存
        }
    };

    useEffect(() => {
        updateCursorPosition();
    }, [content]);

    // 高亮搜索词
    const highlightSearch = () => {
        if (!searchTerm) return content;
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return content.replace(regex, '⟪$1⟫');
    };

    return (
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} flex flex-col border-r border-gray-200 dark:border-gray-700`}>
            <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={updateCursorPosition}
                onKeyUp={updateCursorPosition}
                className="flex-1 p-6 font-mono text-base resize-none focus:outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                style={{
                    lineHeight: '1.8',
                    tabSize: 2
                }}
                spellCheck="false"
                placeholder="在此输入 Markdown 内容..."
            />
        </div>
    );
}

export default Editor;