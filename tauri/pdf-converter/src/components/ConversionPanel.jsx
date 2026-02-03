import React from 'react';
import { Play, Loader2, AlertCircle, CheckCircle2, Zap } from 'lucide-react';

function ConversionPanel({
  selectedFile,
  targetFormat,
  isConverting,
  progress,
  error,
  onConvert
}) {
  const canConvert = selectedFile && targetFormat && !isConverting;

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-amber-400" />
        开始转换
      </h2>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-red-400 mb-1">转换失败</h4>
              <p className="text-red-300/80 text-sm break-words whitespace-pre-wrap">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 转换进度 */}
      {isConverting && (
        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">正在转换...</span>
            <span className="text-primary-400 font-medium">{progress}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-white/40 text-xs text-center">
            {progress < 30 ? '正在读取文件...' :
              progress < 70 ? '正在转换格式...' :
                progress < 90 ? '正在生成文件...' : '即将完成...'}
          </p>
        </div>
      )}

      {/* 转换状态摘要 */}
      {!isConverting && selectedFile && targetFormat && (
        <div className="mb-4 p-4 rounded-xl bg-white/5 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">源文件</span>
            <span className="text-white font-medium truncate max-w-[200px]" title={selectedFile.name}>
              {selectedFile.name}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">源格式</span>
            <span className="tag">{selectedFile.extension.toUpperCase()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">目标格式</span>
            <span className="tag tag-success">{targetFormat.toUpperCase()}</span>
          </div>
        </div>
      )}

      {/* 转换按钮 */}
      <button
        onClick={onConvert}
        disabled={!canConvert}
        className={`
          w-full py-4 rounded-xl font-semibold text-white
          flex items-center justify-center gap-2
          transition-all duration-300
          ${canConvert
            ? 'btn-gradient cursor-pointer'
            : 'bg-white/5 text-white/30 cursor-not-allowed'
          }
        `}
      >
        {isConverting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>转换中...</span>
          </>
        ) : (
          <>
            <Play className="w-5 h-5" />
            <span>开始转换</span>
          </>
        )}
      </button>

      {/* 状态提示 */}
      {!selectedFile && (
        <p className="mt-3 text-center text-white/40 text-sm">
          请先选择要转换的文件
        </p>
      )}
      {selectedFile && !targetFormat && (
        <p className="mt-3 text-center text-white/40 text-sm">
          请选择目标格式
        </p>
      )}

      {/* 提示信息 */}
      <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
        <div className="flex items-start gap-2 text-xs text-white/40">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p>所有文件转换均在本地完成，确保数据安全</p>
        </div>
        <div className="flex items-start gap-2 text-xs text-white/40">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p>支持中文内容，自动处理编码问题</p>
        </div>
      </div>
    </div>
  );
}

export default ConversionPanel;