import React, { useState } from 'react';
import { File, Folder, Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import useStore from '../store/useStore';

const FileTreeItem = ({ node, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentFile, openFile, deleteFile } = useStore();
  const isActive = currentFile === node.path;

  const handleClick = () => {
    if (node.is_file) {
      openFile(node.path);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`确定要删除 ${node.name} 吗?`)) {
      deleteFile(node.path);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors ${isActive ? 'bg-primary-50 text-primary-700' : ''
          }`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={handleClick}
      >
        {!node.is_file && (
          <span className="text-gray-500">
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        )}
        <span className="text-gray-500">
          {node.is_file ? <File size={16} /> : <Folder size={16} />}
        </span>
        <span className="flex-1 text-sm truncate">{node.name}</span>
        {node.is_file && (
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {!node.is_file && isOpen && node.children && (
        <div>
          {node.children.map((child, index) => (
            <FileTreeItem key={index} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar = () => {
  const { files, sidebarOpen, createFile } = useStore();
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleCreateFile = async () => {
    if (newFileName.trim()) {
      try {
        await createFile(newFileName);
        setNewFileName('');
        setShowNewFileInput(false);
      } catch (error) {
        alert('创建文件失败: ' + error);
      }
    }
  };

  if (!sidebarOpen) return null;

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">我的笔记</h2>
          <button
            onClick={() => setShowNewFileInput(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="新建笔记"
          >
            <Plus size={20} />
          </button>
        </div>

        {showNewFileInput && (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFile()}
              placeholder="文件名.md"
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateFile}
                className="flex-1 px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
              >
                创建
              </button>
              <button
                onClick={() => {
                  setShowNewFileInput(false);
                  setNewFileName('');
                }}
                className="flex-1 px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            暂无笔记<br />点击上方 + 创建新笔记
          </div>
        ) : (
          <div className="group">
            {files.map((node, index) => (
              <FileTreeItem key={index} node={node} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
