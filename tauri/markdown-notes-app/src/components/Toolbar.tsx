import React from 'react';
import {
  Save,
  FolderOpen,
  FilePlus,
  Download,
  Eye,
  EyeOff,
  Split,
  Menu,
  Image,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface ToolbarProps {
  onSave: () => void;
  onOpen: () => void;
  onNew: () => void;
  onExport: (format: 'pdf' | 'html' | 'markdown') => void;
  onInsertImage: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onSave,
  onOpen,
  onNew,
  onExport,
  onInsertImage,
}) => {
  const {
    viewMode,
    setViewMode,
    sidebarOpen,
    setSidebarOpen,
    isSaving,
    hasUnsavedChanges,
  } = useAppStore();

  const [showExportMenu, setShowExportMenu] = React.useState(false);

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-2">
      {/* 侧边栏切换 */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Toggle Sidebar"
      >
        <Menu size={20} />
      </button>

      <div className="w-px h-6 bg-gray-300 mx-2" />

      {/* 文件操作 */}
      <button
        onClick={onNew}
        className="p-2 hover:bg-gray-100 rounded transition-colors flex items-center gap-2"
        title="New Note"
      >
        <FilePlus size={20} />
        <span className="text-sm hidden md:inline">New</span>
      </button>

      <button
        onClick={onOpen}
        className="p-2 hover:bg-gray-100 rounded transition-colors flex items-center gap-2"
        title="Open File"
      >
        <FolderOpen size={20} />
        <span className="text-sm hidden md:inline">Open</span>
      </button>

      <button
        onClick={onSave}
        disabled={isSaving || !hasUnsavedChanges}
        className={`p-2 rounded transition-colors flex items-center gap-2 ${
          isSaving || !hasUnsavedChanges
            ? 'text-gray-400 cursor-not-allowed'
            : 'hover:bg-gray-100'
        }`}
        title="Save"
      >
        <Save size={20} />
        <span className="text-sm hidden md:inline">
          {isSaving ? 'Saving...' : 'Save'}
        </span>
      </button>

      <div className="w-px h-6 bg-gray-300 mx-2" />

      {/* 插入图片 */}
      <button
        onClick={onInsertImage}
        className="p-2 hover:bg-gray-100 rounded transition-colors flex items-center gap-2"
        title="Insert Image"
      >
        <Image size={20} />
        <span className="text-sm hidden md:inline">Image</span>
      </button>

      <div className="w-px h-6 bg-gray-300 mx-2" />

      {/* 视图模式 */}
      <div className="flex gap-1 bg-gray-100 rounded p-1">
        <button
          onClick={() => setViewMode('edit')}
          className={`p-1.5 rounded transition-colors ${
            viewMode === 'edit' ? 'bg-white shadow' : 'hover:bg-gray-200'
          }`}
          title="Edit Only"
        >
          <EyeOff size={18} />
        </button>
        <button
          onClick={() => setViewMode('split')}
          className={`p-1.5 rounded transition-colors ${
            viewMode === 'split' ? 'bg-white shadow' : 'hover:bg-gray-200'
          }`}
          title="Split View"
        >
          <Split size={18} />
        </button>
        <button
          onClick={() => setViewMode('preview')}
          className={`p-1.5 rounded transition-colors ${
            viewMode === 'preview' ? 'bg-white shadow' : 'hover:bg-gray-200'
          }`}
          title="Preview Only"
        >
          <Eye size={18} />
        </button>
      </div>

      <div className="flex-1" />

      {/* 导出 */}
      <div className="relative">
        <button
          onClick={() => setShowExportMenu(!showExportMenu)}
          className="p-2 hover:bg-gray-100 rounded transition-colors flex items-center gap-2"
          title="Export"
        >
          <Download size={20} />
          <span className="text-sm hidden md:inline">Export</span>
        </button>

        {showExportMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowExportMenu(false)}
            />
            <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded shadow-lg z-20 py-1 w-40">
              <button
                onClick={() => {
                  onExport('markdown');
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-sm"
              >
                Export as Markdown
              </button>
              <button
                onClick={() => {
                  onExport('html');
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-sm"
              >
                Export as HTML
              </button>
              <button
                onClick={() => {
                  onExport('pdf');
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-sm"
              >
                Export as PDF
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
