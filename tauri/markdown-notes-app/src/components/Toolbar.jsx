import React from 'react';
import { 
  Save, 
  Eye, 
  EyeOff, 
  Download, 
  Menu,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import useStore from '../store/useStore';
import { save } from '@tauri-apps/plugin-dialog';

const Toolbar = () => {
  const { 
    showPreview, 
    togglePreview, 
    toggleSidebar,
    saveFile,
    exportAsHtml,
    exportAsPdf,
    currentFile,
    isSaving,
    lastSaved
  } = useStore();

  const handleExportHtml = async () => {
    if (!currentFile) {
      alert('请先打开一个文件');
      return;
    }
    
    try {
      const filePath = await save({
        defaultPath: 'note.html',
        filters: [{
          name: 'HTML',
          extensions: ['html']
        }]
      });
      
      if (filePath) {
        await exportAsHtml(filePath);
        alert('导出成功!');
      }
    } catch (error) {
      alert('导出失败: ' + error);
    }
  };

  const handleExportPdf = async () => {
    if (!currentFile) {
      alert('请先打开一个文件');
      return;
    }
    
    try {
      const filePath = await save({
        defaultPath: 'note.pdf',
        filters: [{
          name: 'PDF',
          extensions: ['pdf']
        }]
      });
      
      if (filePath) {
        await exportAsPdf(filePath);
        alert('导出成功!');
      }
    } catch (error) {
      alert('导出失败: ' + error);
    }
  };

  const formatLastSaved = () => {
    if (!lastSaved) return '';
    const now = new Date();
    const diff = Math.floor((now - lastSaved) / 1000);
    
    if (diff < 60) return '刚刚保存';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前保存`;
    return lastSaved.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="切换侧边栏"
        >
          <Menu size={20} />
        </button>
        
        <div className="h-6 w-px bg-gray-300"></div>
        
        <button
          onClick={saveFile}
          disabled={!currentFile || isSaving}
          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="保存 (自动保存已启用)"
        >
          <Save size={18} />
          <span className="text-sm">保存</span>
        </button>
        
        <button
          onClick={togglePreview}
          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
          title={showPreview ? '隐藏预览' : '显示预览'}
        >
          {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
          <span className="text-sm">{showPreview ? '隐藏预览' : '显示预览'}</span>
        </button>
      </div>
      
      <div className="flex items-center gap-3">
        {lastSaved && (
          <span className="text-xs text-gray-500">
            {isSaving ? '保存中...' : formatLastSaved()}
          </span>
        )}
        
        <div className="h-6 w-px bg-gray-300"></div>
        
        <div className="relative group">
          <button
            disabled={!currentFile}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            <span className="text-sm">导出</span>
          </button>
          
          {currentFile && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <button
                onClick={handleExportHtml}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left text-sm"
              >
                <FileText size={16} />
                导出为 HTML
              </button>
              <button
                onClick={handleExportPdf}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left text-sm"
              >
                <FileText size={16} />
                导出为 PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
