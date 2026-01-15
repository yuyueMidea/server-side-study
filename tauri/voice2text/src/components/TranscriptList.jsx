import React from 'react';
import { Trash2, FileText } from 'lucide-react';
import TranscriptItem from './TranscriptItem';

function TranscriptList({ transcripts, onDelete, onClearAll }) {
    if (transcripts.length === 0) {
        return (
            <div className="h-full flex items-center justify-center p-8">
                <div className="text-center text-gray-500">
                    <FileText size={64} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-xl mb-2 font-semibold">暂无录音记录</p>
                    <p className="text-sm">开始录音后,历史记录将显示在这里</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                    历史记录 <span className="text-indigo-600">({transcripts.length})</span>
                </h2>
                <button
                    onClick={onClearAll}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition shadow-md hover:shadow-lg"
                >
                    <Trash2 size={18} />
                    清空全部
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {transcripts.map(transcript => (
                    <TranscriptItem
                        key={transcript.id}
                        transcript={transcript}
                        onDelete={onDelete}
                    />
                ))}
            </div>
        </div>
    );
}

export default TranscriptList;