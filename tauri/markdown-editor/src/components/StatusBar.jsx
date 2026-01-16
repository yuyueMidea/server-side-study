import React, { useState, useEffect } from 'react';

function StatusBar({ content, currentFile, isModified, theme }) {
    const [stats, setStats] = useState({ words: 0, chars: 0, lines: 0 });

    useEffect(() => {
        const lines = content.split('\n').length;
        const chars = content.length;
        const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
        setStats({ words, chars, lines });
    }, [content]);

    const getFileName = () => {
        if (!currentFile) return '未命名文档';
        const parts = currentFile.split(/[/\\]/);
        return parts[parts.length - 1];
    };

    return (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-6 py-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <span className="font-medium">
                        {getFileName()} {isModified && <span className="text-blue-600">●</span>}
                    </span>
                    <span>{stats.lines} 行</span>
                </div>
                <div className="flex items-center gap-4">
                    <span>{stats.words} 词</span>
                    <span>{stats.chars} 字符</span>
                </div>
            </div>
        </div>
    );
}

export default StatusBar;