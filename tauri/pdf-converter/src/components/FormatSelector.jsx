import React from 'react';
import { ArrowRight, FileText, File, Hash, Code, FileType, Check } from 'lucide-react';
import { getFileIcon, getAvailableTargetFormats } from '../utils/fileUtils';

const FORMAT_INFO = {
  pdf: {
    name: 'PDF',
    description: '便携文档格式',
    icon: FileText,
    color: 'from-red-500/20 to-red-600/20 border-red-500/30 text-red-400',
  },
  docx: {
    name: 'DOCX',
    description: 'Word 文档',
    icon: FileType,
    color: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400',
  },
  txt: {
    name: 'TXT',
    description: '纯文本文件',
    icon: File,
    color: 'from-gray-500/20 to-gray-600/20 border-gray-500/30 text-gray-400',
  },
  md: {
    name: 'Markdown',
    description: '标记语言文档',
    icon: Hash,
    color: 'from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400',
  },
  html: {
    name: 'HTML',
    description: '网页文档',
    icon: Code,
    color: 'from-orange-500/20 to-orange-600/20 border-orange-500/30 text-orange-400',
  },
};

function FormatSelector({ selectedFile, targetFormat, onFormatSelect }) {
  const availableFormats = selectedFile 
    ? getAvailableTargetFormats(selectedFile.extension)
    : [];

  const SourceIcon = selectedFile ? getFileIcon(selectedFile.extension) : FileText;

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
        <ArrowRight className="w-5 h-5 text-primary-400" />
        选择目标格式
      </h2>

      {selectedFile ? (
        <div className="space-y-4">
          {/* 转换方向指示 */}
          <div className="flex items-center justify-center gap-4 p-4 rounded-xl bg-white/5">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${FORMAT_INFO[selectedFile.extension]?.color || 'bg-white/10'}`}>
                <SourceIcon className="w-5 h-5" />
              </div>
              <span className="text-white font-medium">
                {selectedFile.extension.toUpperCase()}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <div className="w-8 h-0.5 bg-gradient-to-r from-primary-500 to-transparent" />
              <ArrowRight className="w-5 h-5 text-primary-400" />
              <div className="w-8 h-0.5 bg-gradient-to-l from-accent-500 to-transparent" />
            </div>
            
            <div className="flex items-center gap-2">
              {targetFormat ? (
                <>
                  <div className={`p-2 rounded-lg ${FORMAT_INFO[targetFormat]?.color || 'bg-white/10'}`}>
                    {React.createElement(FORMAT_INFO[targetFormat]?.icon || FileText, { className: 'w-5 h-5' })}
                  </div>
                  <span className="text-white font-medium">
                    {targetFormat.toUpperCase()}
                  </span>
                </>
              ) : (
                <span className="text-white/40">请选择</span>
              )}
            </div>
          </div>

          {/* 可用格式列表 */}
          <div className="flex flex-nowrap gap-3 w-full">
            {availableFormats.map((format) => {
              const formatInfo = FORMAT_INFO[format];
              const Icon = formatInfo?.icon || FileText;
              const isSelected = targetFormat === format;

              return (
                <button
                  key={format}
                  onClick={() => onFormatSelect(format)}
                  className={`
                    format-card relative overflow-hidden
                    ${isSelected ? 'selected' : ''}
                  `}
                >
                  {/* 选中指示器 */}
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  )}

                  <div className={`
                    p-3 rounded-lg mb-2 inline-flex
                    bg-gradient-to-br ${formatInfo?.color || 'from-white/10 to-white/5'}
                  `}>
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  <div className="text-left">
                    <h3 className="font-semibold text-white text-sm">
                      {formatInfo?.name || format.toUpperCase()}
                    </h3>
                    <p className="text-white/40 text-xs mt-0.5">
                      {formatInfo?.description || '文档格式'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {availableFormats.length === 0 && (
            <div className="text-center py-8 text-white/40">
              <p>暂不支持此格式的转换</p>
            </div>
          )}
        </div>
      ) : (
        // 未选择文件时的提示
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-white/40">
            请先选择要转换的文件
          </p>
        </div>
      )}
    </div>
  );
}

export default FormatSelector;
