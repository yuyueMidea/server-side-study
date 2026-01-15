import React, { useState } from 'react';
import { Copy, Trash2, Download, ChevronDown, ChevronUp } from 'lucide-react';

import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

function TranscriptItem({ transcript, onDelete }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return '刚刚';
        if (diffMins < 60) return `${diffMins}分钟前`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`;

        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const copyToClipboard = async (e) => {
        e.stopPropagation();
        setIsProcessing(true);

        try {
            await writeText(transcript.text);
            showToast('已复制到剪贴板');
        } catch (err) {
            console.error('复制失败:', err);
            showToast('复制失败', true);
        } finally {
            setIsProcessing(false);
        }
    };

    const saveToFile = async (e) => {
        e.stopPropagation();
        setIsProcessing(true);

        try {
            const timestamp = new Date(transcript.timestamp).toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filePath = await save({
                defaultPath: `transcript_${transcript.id}_${timestamp}.txt`,
                filters: [{
                    name: 'Text Files',
                    extensions: ['txt']
                }]
            });

            if (filePath) {
                await writeTextFile(filePath, transcript.text);
                showToast('保存成功');
            }
        } catch (err) {
            console.error('保存失败:', err);
            showToast('保存失败', true);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        if (window.confirm('确定要删除这条记录吗?')) {
            onDelete(transcript.id);
        }
    };

    const showToast = (message, isError = false) => {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${isError ? '#ef4444' : '#10b981'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 1000;
    `;

        document.body.appendChild(toast);

        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 2000);
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const getLanguageName = (code) => {
        const languages = {
            'zh-CN': '中文简体',
            'zh-TW': '中文繁体',
            'en-US': '英语',
            'en-GB': '英语(英国)',
            'ja-JP': '日语',
            'ko-KR': '韩语'
        };
        return languages[code] || code;
    };

    return (
        <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-4">
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <span>{formatDate(transcript.timestamp)}</span>
                        <span>•</span>
                        <span>{getLanguageName(transcript.language)}</span>
                        <span>•</span>
                        <span>{transcript.text.length} 字</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={copyToClipboard}
                        disabled={isProcessing}
                        className="text-green-600 hover:text-green-700 transition p-1 hover:bg-green-50 rounded disabled:opacity-50"
                        title="复制"
                    >
                        <Copy size={18} />
                    </button>
                    <button
                        onClick={saveToFile}
                        disabled={isProcessing}
                        className="text-blue-600 hover:text-blue-700 transition p-1 hover:bg-blue-50 rounded disabled:opacity-50"
                        title="保存"
                    >
                        <Download size={18} />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="text-red-600 hover:text-red-700 transition p-1 hover:bg-red-50 rounded"
                        title="删除"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            <div
                className="cursor-pointer"
                onClick={toggleExpand}
            >
                <p className={`text-gray-700 ${isExpanded ? '' : 'line-clamp-3'}`}>
                    {transcript.text}
                </p>

                {transcript.text.length > 150 && (
                    <button
                        className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm flex items-center gap-1"
                    >
                        {isExpanded ? (
                            <>
                                收起 <ChevronUp size={16} />
                            </>
                        ) : (
                            <>
                                展开 <ChevronDown size={16} />
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}

export default TranscriptItem;