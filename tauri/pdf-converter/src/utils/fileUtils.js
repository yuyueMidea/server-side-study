import { FileText, FileType, File, Hash, Code } from 'lucide-react';

// 格式化文件大小
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化日期
export function formatDate(date) {
  if (!date) return '';

  const d = new Date(date);
  const now = new Date();
  const diff = now - d;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 获取文件图标
export function getFileIcon(extension) {
  const ext = extension?.toLowerCase();

  switch (ext) {
    case 'pdf':
      return FileText;
    case 'doc':
    case 'docx':
      return FileType;
    case 'txt':
      return File;
    case 'md':
    case 'markdown':
      return Hash;
    case 'html':
    case 'htm':
      return Code;
    default:
      return File;
  }
}

// 获取文件类型颜色
export function getFileTypeColor(extension) {
  const ext = extension?.toLowerCase();

  switch (ext) {
    case 'pdf':
      return 'bg-red-500/10 text-red-400';
    case 'doc':
    case 'docx':
      return 'bg-blue-500/10 text-blue-400';
    case 'txt':
      return 'bg-gray-500/10 text-gray-400';
    case 'md':
    case 'markdown':
      return 'bg-purple-500/10 text-purple-400';
    case 'html':
    case 'htm':
      return 'bg-orange-500/10 text-orange-400';
    default:
      return 'bg-white/10 text-white/60';
  }
}

// 获取可用的目标格式
export function getAvailableTargetFormats(sourceExtension) {
  const ext = sourceExtension?.toLowerCase();

  // 所有格式都可以互相转换
  const allFormats = ['pdf', 'docx', 'txt', 'md', 'html'];

  // 排除源格式自身
  const normalizedExt = ext === 'markdown' ? 'md' : ext === 'htm' ? 'html' : ext === 'doc' ? 'docx' : ext;

  return allFormats.filter(f => f !== normalizedExt);
}

// 验证文件类型
export function isValidFileType(extension) {
  const validExtensions = ['pdf', 'doc', 'docx', 'txt', 'md', 'markdown', 'html', 'htm', 'rtf'];
  return validExtensions.includes(extension?.toLowerCase());
}

// 生成唯一 ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 获取文件名（不含扩展名）
export function getFileNameWithoutExtension(fileName) {
  if (!fileName) return '';
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
}

// 获取输出文件名
export function getOutputFileName(sourceFileName, targetFormat) {
  const baseName = getFileNameWithoutExtension(sourceFileName);
  return `${baseName}.${targetFormat}`;
}

// 获取格式显示名称
export function getFormatDisplayName(format) {
  const names = {
    pdf: 'PDF 文档',
    docx: 'Word 文档',
    doc: 'Word 文档',
    txt: '纯文本',
    md: 'Markdown',
    markdown: 'Markdown',
    html: 'HTML 网页',
    htm: 'HTML 网页',
  };
  return names[format?.toLowerCase()] || format?.toUpperCase() || '未知格式';
}