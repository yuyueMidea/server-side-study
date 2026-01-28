import React from 'react';
import { FolderOpen, X } from 'lucide-react';
import { FileTree } from './FileTree';
import { FileNode } from '../types';
import { useAppStore } from '../store/useAppStore';

interface SidebarProps {
  files: FileNode[];
  onFileSelect: (path: string) => void;
  onOpenFolder: () => void;
  onLoadChildren?: (node: FileNode) => Promise<FileNode[]>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  onFileSelect,
  onOpenFolder,
  onLoadChildren,
}) => {
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  if (!sidebarOpen) {
    return null;
  }

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4">
        <h2 className="font-semibold text-gray-700">Files</h2>
        <button
          onClick={() => setSidebarOpen(false)}
          className="p-1 hover:bg-gray-200 rounded transition-colors lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      {/* Actions */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onOpenFolder}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
        >
          <FolderOpen size={18} />
          <span>Open Folder</span>
        </button>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-auto">
        <FileTree
          nodes={files}
          onFileSelect={onFileSelect}
          onLoadChildren={onLoadChildren}
        />
      </div>
    </div>
  );
};
