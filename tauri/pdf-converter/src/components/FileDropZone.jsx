import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, File, X, FileText, FileType, Code, Hash, Eye, Loader2 } from 'lucide-react';
import { formatFileSize, getFileIcon, getFileTypeColor } from '../utils/fileUtils';
import { getFilePreview } from '../utils/converters';

function FileDropZone({ selectedFile, onFileSelect, onClearFile }) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const dragCounterRef = useRef(0);

  const processFile = useCallback((file) => {
    if (!file) return;

    const fileName = file.name || 'unknown';
    const extension = fileName.split('.').pop().toLowerCase();
    const supportedFormats = ['pdf', 'doc', 'docx', 'txt', 'md', 'markdown', 'html', 'htm', 'rtf'];

    if (!supportedFormats.includes(extension)) {
      alert('不支持的文件格式！请选择 PDF、Word、TXT、Markdown 或 HTML 文件。');
      return;
    }

    const fileInfo = {
      name: fileName,
      size: file.size || 0,
      type: file.type || getMimeType(fileName),
      extension: extension,
      file: file,
      lastModified: file.lastModified ? new Date(file.lastModified) : new Date(),
    };

    onFileSelect(fileInfo);
  }, [onFileSelect]);

  // 加载预览
  useEffect(() => {
    if (!selectedFile) {
      setPreview(null);
      return;
    }

    const loadPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const previewData = await getFilePreview(selectedFile.file, selectedFile.extension);
        setPreview(previewData);
      } catch (error) {
        console.error('预览加载失败:', error);
        setPreview({ type: 'error', content: '预览加载失败: ' + error.message });
      } finally {
        setIsLoadingPreview(false);
      }
    };

    loadPreview();
  }, [selectedFile]);

  const handleFileInput = useCallback((e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
    e.target.value = '';
  }, [processFile]);

  // 监听 Tauri 文件拖放事件
  useEffect(() => {
    let unlistenDrop = null;
    let unlistenEnter = null;
    let unlistenLeave = null;

    const setupTauriDrop = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        const { invoke } = await import('@tauri-apps/api/core');

        unlistenDrop = await listen('tauri://drag-drop', async (event) => {
          setIsDragging(false);
          const paths = event.payload.paths;
          if (paths && paths.length > 0) {
            const filePath = paths[0];

            try {
              // 调用 Rust 端读取文件
              const fileData = await invoke('read_file_binary', { path: filePath });

              // 创建 Blob 对象
              const uint8Array = new Uint8Array(fileData.data);
              const mimeType = getMimeType(fileData.name);
              const blob = new Blob([uint8Array], { type: mimeType });

              // 创建一个类 File 对象（不使用 File 构造函数）
              const fileObject = blob;
              fileObject.name = fileData.name;
              fileObject.lastModified = Date.now();

              // 添加 arrayBuffer 方法（如果不存在）
              if (!fileObject.arrayBuffer) {
                fileObject.arrayBuffer = function () {
                  return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsArrayBuffer(this);
                  });
                };
              }

              processFile(fileObject);
            } catch (e) {
              console.error('文件读取失败:', e);
              alert('文件读取失败: ' + e.message + '\n请点击选择文件');
            }
          }
        });

        // 监听拖拽悬停状态
        unlistenEnter = await listen('tauri://drag-enter', () => {
          setIsDragging(true);
        });

        unlistenLeave = await listen('tauri://drag-leave', () => {
          setIsDragging(false);
        });

      } catch (e) {
        console.log('Tauri API 初始化:', e);
      }
    };

    setupTauriDrop();

    return () => {
      if (unlistenDrop) unlistenDrop();
      if (unlistenEnter) unlistenEnter();
      if (unlistenLeave) unlistenLeave();
    };
  }, [processFile]);

  // 标准 HTML5 拖放事件（作为备用）
  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    const handleDragEnter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current++;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    };

    dropZone.addEventListener('dragenter', handleDragEnter);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('drop', handleDrop);

    return () => {
      dropZone.removeEventListener('dragenter', handleDragEnter);
      dropZone.removeEventListener('dragleave', handleDragLeave);
      dropZone.removeEventListener('dragover', handleDragOver);
      dropZone.removeEventListener('drop', handleDrop);
    };
  }, [processFile]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    setPreview(null);
    onClearFile();
  };

  const FileIconComponent = getFileIcon(selectedFile?.extension);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary-400" />
          选择文件
        </h2>
        {selectedFile && (
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {selectedFile ? (
        <div className="space-y-4">
          {/* 文件信息 */}
          <div className={`p-4 rounded-xl ${getFileTypeColor(selectedFile.extension)} border border-white/10`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${getFileTypeColor(selectedFile.extension)}`}>
                <FileIconComponent className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate mb-1">
                  {selectedFile.name}
                </h3>
                <div className="flex flex-wrap gap-2 text-sm text-white/60">
                  <span className="tag">
                    {selectedFile.extension.toUpperCase()}
                  </span>
                  <span className="tag">
                    {formatFileSize(selectedFile.size)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 文件预览 */}
          <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-white/5">
              <Eye className="w-4 h-4 text-primary-400" />
              <span className="text-sm font-medium text-white/80">内容预览</span>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto custom-scrollbar">
              {isLoadingPreview ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
                  <span className="ml-2 text-white/60">加载预览中...</span>
                </div>
              ) : preview ? (
                <pre className="text-sm text-white/70 whitespace-pre-wrap font-mono leading-relaxed break-words">
                  {preview.content || '无法预览此文件'}
                </pre>
              ) : (
                <p className="text-white/40 text-center py-4">暂无预览</p>
              )}
            </div>
          </div>

          {/* 重新选择按钮 */}
          <button
            onClick={handleClick}
            className="w-full btn-secondary text-sm"
          >
            重新选择文件
          </button>
        </div>
      ) : (
        <div
          ref={dropZoneRef}
          className={`drop-zone ${isDragging ? 'active' : ''}`}
          onClick={handleClick}
        >
          <div className="text-center">
            <div className="relative inline-block mb-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center mx-auto">
                <Upload className={`w-10 h-10 transition-all duration-300 ${isDragging ? 'text-primary-400 scale-110' : 'text-white/40'}`} />
              </div>
              {isDragging && (
                <div className="absolute inset-0 rounded-2xl border-2 border-primary-400 animate-pulse" />
              )}
            </div>

            <h3 className="text-lg font-semibold text-white mb-2">
              {isDragging ? '释放以上传文件' : '拖放文件到这里'}
            </h3>
            <p className="text-white/40 text-sm mb-4">
              或点击选择文件
            </p>

            <div className="flex flex-wrap justify-center gap-2">
              <FormatBadge icon={<FileText className="w-3 h-3" />} label="PDF" />
              <FormatBadge icon={<FileType className="w-3 h-3" />} label="DOC/DOCX" />
              <FormatBadge icon={<File className="w-3 h-3" />} label="TXT" />
              <FormatBadge icon={<Hash className="w-3 h-3" />} label="Markdown" />
              <FormatBadge icon={<Code className="w-3 h-3" />} label="HTML" />
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.md,.markdown,.html,.htm,.rtf"
        onChange={handleFileInput}
      />
    </div>
  );
}

function getMimeType(fileName) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  const mimeTypes = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    md: 'text/markdown',
    markdown: 'text/markdown',
    html: 'text/html',
    htm: 'text/html',
    rtf: 'application/rtf',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

function FormatBadge({ icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-white/60 text-xs">
      {icon}
      {label}
    </span>
  );
}

export default FileDropZone;