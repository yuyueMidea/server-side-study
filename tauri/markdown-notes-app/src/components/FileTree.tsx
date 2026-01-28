import React from 'react';
import { File, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { FileNode } from '../types';
import { useAppStore } from '../store/useAppStore';

interface FileTreeProps {
  nodes: FileNode[];
  onFileSelect: (path: string) => void;
  onLoadChildren?: (node: FileNode) => Promise<FileNode[]>;
}

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  onFileSelect: (path: string) => void;
  onLoadChildren?: (node: FileNode) => Promise<FileNode[]>;
  selectedPath: string | null;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({
  node,
  level,
  onFileSelect,
  onLoadChildren,
  selectedPath,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [children, setChildren] = React.useState<FileNode[]>(node.children || []);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleToggle = async () => {
    if (node.isDirectory) {
      if (!isExpanded && onLoadChildren && children.length === 0) {
        setIsLoading(true);
        try {
          const loadedChildren = await onLoadChildren(node);
          setChildren(loadedChildren);
        } catch (error) {
          console.error('Error loading children:', error);
        }
        setIsLoading(false);
      }
      setIsExpanded(!isExpanded);
    }
  };

  const handleClick = () => {
    if (!node.isDirectory) {
      onFileSelect(node.path);
    } else {
      handleToggle();
    }
  };

  const isSelected = selectedPath === node.path;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-gray-100 rounded transition-colors ${
          isSelected ? 'bg-primary-100' : ''
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.isDirectory && (
          <span className="flex-shrink-0" onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}>
            {isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </span>
        )}
        
        {!node.isDirectory && <span className="w-4" />}
        
        <span className="flex-shrink-0">
          {node.isDirectory ? (
            isExpanded ? (
              <FolderOpen size={16} className="text-primary-600" />
            ) : (
              <Folder size={16} className="text-primary-600" />
            )
          ) : (
            <File size={16} className="text-gray-600" />
          )}
        </span>
        
        <span className="text-sm truncate">{node.name}</span>
        
        {isLoading && (
          <span className="ml-auto text-xs text-gray-500">Loading...</span>
        )}
      </div>

      {node.isDirectory && isExpanded && children.length > 0 && (
        <div>
          {children.map((child, index) => (
            <FileTreeItem
              key={`${child.path}-${index}`}
              node={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              onLoadChildren={onLoadChildren}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({
  nodes,
  onFileSelect,
  onLoadChildren,
}) => {
  const { selectedFilePath } = useAppStore();

  return (
    <div className="h-full overflow-auto p-2">
      {nodes.length === 0 ? (
        <div className="text-center text-gray-500 text-sm mt-8">
          <p>No files to display</p>
          <p className="mt-2">Open a folder to get started</p>
        </div>
      ) : (
        <div>
          {nodes.map((node, index) => (
            <FileTreeItem
              key={`${node.path}-${index}`}
              node={node}
              level={0}
              onFileSelect={onFileSelect}
              onLoadChildren={onLoadChildren}
              selectedPath={selectedFilePath}
            />
          ))}
        </div>
      )}
    </div>
  );
};
