import React, { useState, useEffect } from 'react';
import { Mic, Square, Copy, Download, AlertCircle } from 'lucide-react';
import useSpeechRecognition from '../hooks/useSpeechRecognition';

import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

function Recorder({ onTranscriptComplete, settings }) {
    const [transcript, setTranscript] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const {
        isListening,
        startListening,
        stopListening,
        transcript: liveTranscript,
        error
    } = useSpeechRecognition(settings.language, settings.continuous);

    useEffect(() => {
        if (liveTranscript) {
            setTranscript(liveTranscript);
        }
    }, [liveTranscript]);

    const handleStart = () => {
        setTranscript('');
        startListening();
    };

    const handleStop = async () => {
        stopListening();

        if (transcript.trim()) {
            onTranscriptComplete(transcript);

            if (settings.autoCopy) {
                await copyToClipboard();
            }
        }
    };

    const copyToClipboard = async () => {
        if (!transcript.trim()) {
            alert('没有可复制的内容');
            return;
        }

        try {
            await writeText(transcript);
            showNotification('已复制到剪贴板');
        } catch (err) {
            console.error('复制失败:', err);
            alert('复制失败: ' + err.message);
        }
    };

    const saveToFile = async () => {
        if (!transcript.trim()) {
            alert('没有可保存的内容');
            return;
        }

        setIsSaving(true);

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filePath = await save({
                defaultPath: `transcript_${timestamp}.txt`,
                filters: [{
                    name: 'Text Files',
                    extensions: ['txt']
                }]
            });

            if (filePath) {
                await writeTextFile(filePath, transcript);
                showNotification('保存成功');
            }
        } catch (err) {
            console.error('保存失败:', err);
            alert('保存失败: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const showNotification = (message) => {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 2000);
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="mb-8">
                {!isListening ? (
                    <button
                        onClick={handleStart}
                        disabled={!!error && !error.includes('未检测到语音')}
                        className="w-32 h-32 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-2xl transition transform hover:scale-105 active:scale-95"
                    >
                        <Mic size={48} />
                    </button>
                ) : (
                    <button
                        onClick={handleStop}
                        className="w-32 h-32 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-2xl transition transform hover:scale-105 active:scale-95 animate-pulse"
                    >
                        <Square size={48} />
                    </button>
                )}
            </div>

            <div className="text-center mb-4">
                {isListening ? (
                    <p className="text-lg font-semibold text-indigo-600 animate-pulse">
                        🎙️ 正在聆听...
                    </p>
                ) : (
                    <p className="text-lg text-gray-600">
                        点击麦克风开始录音
                    </p>
                )}
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg max-w-2xl flex items-start gap-3">
                    <AlertCircle size={24} className="flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">错误:</p>
                        <p>{error}</p>
                        {error.includes('不支持') && (
                            <p className="mt-2 text-sm">
                                请使用 Chrome 或 Edge 浏览器以获得最佳体验
                            </p>
                        )}
                    </div>
                </div>
            )}

            {transcript && (
                <div className="w-full max-w-2xl">
                    <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800">转录文本:</h3>
                        <div className="bg-gray-50 rounded p-4 max-h-64 overflow-y-auto">
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {transcript}
                            </p>
                        </div>
                        <div className="mt-3 text-sm text-gray-500">
                            字数: {transcript.length}
                        </div>
                    </div>

                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={copyToClipboard}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition shadow-md hover:shadow-lg"
                        >
                            <Copy size={20} />
                            复制
                        </button>
                        <button
                            onClick={saveToFile}
                            disabled={isSaving}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2 transition shadow-md hover:shadow-lg"
                        >
                            <Download size={20} />
                            {isSaving ? '保存中...' : '保存'}
                        </button>
                    </div>
                </div>
            )}

            <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
        </div>
    );
}

export default Recorder;