import React from 'react';
import { History, Trash2, Download, FileText, Clock, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { formatFileSize, getFileIcon, formatDate } from '../utils/fileUtils';

function ConversionHistory({ history, onClearHistory }) {
  if (!history || history.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
          <History className="w-10 h-10 text-white/20" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">暂无转换记录</h2>
        <p className="text-white/40">
          您的文件转换历史将显示在这里
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <History className="w-7 h-7 text-primary-400" />
            转换历史
          </h2>
          <p className="text-white/40 mt-1">
            共 {history.length} 条记录
          </p>
        </div>
        <button
          onClick={onClearHistory}
          className="btn-secondary flex items-center gap-2 text-red-400 hover:text-red-300 hover:border-red-500/30"
        >
          <Trash2 className="w-4 h-4" />
          清空历史
        </button>
      </div>

      {/* 历史记录列表 */}
      <div className="space-y-4">
        {history.map((record, index) => (
          <HistoryItem key={record.id || index} record={record} />
        ))}
      </div>
    </div>
  );
}

function HistoryItem({ record }) {
  const SourceIcon = getFileIcon(record.sourceFormat);
  const TargetIcon = getFileIcon(record.targetFormat);
  const isSuccess = record.status === 'success';

  const handleDownload = async () => {
    if (record.outputPath) {
      // 在 Tauri 环境中打开文件位置
      try {
        // 使用 Tauri 的 dialog API 或直接提示用户
        alert(`文件已保存至: ${record.outputPath}`);
      } catch (e) {
        console.log('操作失败::', e);
      }
    }
  };

  return (
    <div className="glass-card-hover p-5 animate-slide-up">
      <div className="flex items-start gap-4">
        {/* 状态指示 */}
        <div className={`
          p-2 rounded-xl flex-shrink-0
          ${isSuccess ? 'bg-emerald-500/20' : 'bg-red-500/20'}
        `}>
          {isSuccess ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          ) : (
            <XCircle className="w-6 h-6 text-red-400" />
          )}
        </div>

        {/* 主要内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-white truncate">
              {record.fileName}
            </h3>
            <span className={`tag ${isSuccess ? 'tag-success' : 'tag-error'}`}>
              {isSuccess ? '成功' : '失败'}
            </span>
          </div>

          {/* 转换信息 */}
          <div className="flex items-center gap-3 text-sm mb-3">
            <div className="flex items-center gap-1.5 text-white/60">
              <SourceIcon className="w-4 h-4" />
              <span>{record.sourceFormat?.toUpperCase()}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-primary-400" />
            <div className="flex items-center gap-1.5 text-white/60">
              <TargetIcon className="w-4 h-4" />
              <span>{record.targetFormat?.toUpperCase()}</span>
            </div>
          </div>

          {/* 元信息 */}
          <div className="flex items-center gap-4 text-xs text-white/40">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDate(record.timestamp)}</span>
            </div>
            {record.fileSize && (
              <span>{formatFileSize(record.fileSize)}</span>
            )}
            {record.duration && (
              <span>耗时 {record.duration}ms</span>
            )}
          </div>

          {/* 错误信息 */}
          {!isSuccess && record.error && (
            <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-red-300/80 text-sm">{record.error}</p>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        {isSuccess && record.outputPath && (
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
            title="打开文件位置"
          >
            <Download className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
          </button>
        )}
      </div>
    </div>
  );
}

export default ConversionHistory;
