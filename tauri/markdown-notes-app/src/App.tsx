import React from 'react';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { useAppStore } from './store/useAppStore';
import { fileApi, noteApi, exportApi, imageApi } from './utils/tauriApi';
import { extractTitle, generateFullHtml, generateId } from './utils/helpers';
import { useAutoSave } from './hooks/useAutoSave';
import { FileNode, Note } from './types';

function App() {
  const {
    currentNote,
    setCurrentNote,
    editorContent,
    setEditorContent,
    viewMode,
    settings,
    setSelectedFilePath,
    setIsSaving,
    setHasUnsavedChanges,
  } = useAppStore();

  const [fileTree, setFileTree] = React.useState<FileNode[]>([]);
  const [currentDirectory, setCurrentDirectory] = React.useState<string>('');
  const editorRef = React.useRef<any>(null);

  // 自动保存
  const handleAutoSave = React.useCallback(async () => {
    if (currentNote && editorContent !== currentNote.content) {
      await handleSave();
    }
  }, [currentNote, editorContent]);

  const debouncedSave = useAutoSave({
    enabled: settings.autoSave,
    delay: settings.autoSaveInterval,
    onSave: handleAutoSave,
  });

  // 监听内容变化触发自动保存
  React.useEffect(() => {
    if (settings.autoSave && currentNote) {
      setHasUnsavedChanges(editorContent !== currentNote.content);
      debouncedSave();
    }
  }, [editorContent, settings.autoSave, currentNote, debouncedSave, setHasUnsavedChanges]);

  // 打开文件夹
  const handleOpenFolder = async () => {
    const path = await fileApi.selectDirectory();
    if (path) {
      setCurrentDirectory(path);
      const files = await fileApi.readDirectory(path);
      setFileTree(files);
    }
  };

  // 加载子文件夹
  const handleLoadChildren = async (node: FileNode): Promise<FileNode[]> => {
    if (node.isDirectory) {
      return await fileApi.readDirectory(node.path);
    }
    return [];
  };

  // 选择文件
  const handleFileSelect = async (path: string) => {
    try {
      setSelectedFilePath(path);
      const note = await noteApi.loadNote(path);
      setCurrentNote(note);
      setEditorContent(note.content);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error loading file:', error);
      alert('Failed to load file');
    }
  };

  // 新建笔记
  const handleNewNote = async () => {
    if (!currentDirectory) {
      alert('Please open a folder first');
      return;
    }

    const title = 'Untitled';
    const fileName = `${title}-${generateId()}.md`;
    const path = `${currentDirectory}/${fileName}`;

    try {
      const note = await noteApi.createNote(title, '', path);
      setCurrentNote(note);
      setEditorContent('');
      setHasUnsavedChanges(false);
      
      // 刷新文件树
      const files = await fileApi.readDirectory(currentDirectory);
      setFileTree(files);
    } catch (error) {
      console.error('Error creating note:', error);
      alert('Failed to create note');
    }
  };

  // 打开文件
  const handleOpenFile = async () => {
    const path = await fileApi.selectFile();
    if (path) {
      await handleFileSelect(path);
    }
  };

  // 保存
  const handleSave = async () => {
    if (!currentNote) {
      // 如果没有当前笔记，另存为
      await handleSaveAs();
      return;
    }

    try {
      setIsSaving(true);
      const updatedNote: Note = {
        ...currentNote,
        content: editorContent,
        title: extractTitle(editorContent),
        updated_at: new Date().toISOString(),
      };
      
      await noteApi.updateNote(updatedNote);
      setCurrentNote(updatedNote);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  // 另存为
  const handleSaveAs = async () => {
    const title = extractTitle(editorContent) || 'untitled';
    const path = await fileApi.saveFileDialog(`${title}.md`);
    
    if (path) {
      try {
        setIsSaving(true);
        const note = await noteApi.createNote(title, editorContent, path);
        setCurrentNote(note);
        setHasUnsavedChanges(false);
        
        // 如果在当前目录下，刷新文件树
        if (currentDirectory && path.startsWith(currentDirectory)) {
          const files = await fileApi.readDirectory(currentDirectory);
          setFileTree(files);
        }
      } catch (error) {
        console.error('Error saving note:', error);
        alert('Failed to save note');
      } finally {
        setIsSaving(false);
      }
    }
  };

  // 导出
  const handleExport = async (format: 'pdf' | 'html' | 'markdown') => {
    const title = currentNote?.title || extractTitle(editorContent) || 'untitled';
    
    let defaultPath = '';
    switch (format) {
      case 'pdf':
        defaultPath = `${title}.pdf`;
        break;
      case 'html':
        defaultPath = `${title}.html`;
        break;
      case 'markdown':
        defaultPath = `${title}.md`;
        break;
    }

    const path = await fileApi.saveFileDialog(defaultPath);
    if (!path) return;

    try {
      switch (format) {
        case 'pdf':
          await exportApi.exportToPdf(editorContent, path);
          break;
        case 'html':
          const htmlContent = generateFullHtml(editorContent, title);
          await fileApi.writeFile(path, htmlContent);
          break;
        case 'markdown':
          await exportApi.exportToMarkdown(editorContent, path);
          break;
      }
      alert(`Exported successfully to ${path}`);
    } catch (error) {
      console.error('Error exporting:', error);
      alert(`Failed to export as ${format.toUpperCase()}`);
    }
  };

  // 插入图片
  const handleInsertImage = async () => {
    const imagePath = await imageApi.selectImage();
    if (!imagePath) return;

    try {
      // 如果有当前目录，保存图片到 images 子目录
      let finalPath = imagePath;
      
      if (currentDirectory) {
        const imagesDir = `${currentDirectory}/images`;
        const imageExists = await fileApi.fileExists(imagesDir);
        
        if (!imageExists) {
          await fileApi.createDirectory(imagesDir);
        }

        const fileName = imagePath.split('/').pop() || 'image.png';
        finalPath = await imageApi.saveImage(imagePath, fileName, imagesDir);
      }

      // 插入 Markdown 图片语法
      const imageMarkdown = `\n![Image](${finalPath})\n`;
      setEditorContent(editorContent + imageMarkdown);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Error inserting image:', error);
      alert('Failed to insert image');
    }
  };

  // 处理拖拽图片
  const handleImageDrop = async (file: File) => {
    try {
      if (!currentDirectory) {
        alert('Please open a folder first');
        return;
      }

      const imagesDir = `${currentDirectory}/images`;
      const imageExists = await fileApi.fileExists(imagesDir);
      
      if (!imageExists) {
        await fileApi.createDirectory(imagesDir);
      }

      // 读取文件为 base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        const fileName = file.name;
        
        try {
          const finalPath = await imageApi.saveImage(base64Data, fileName, imagesDir);
          const imageMarkdown = `\n![Image](${finalPath})\n`;
          setEditorContent(editorContent + imageMarkdown);
          setHasUnsavedChanges(true);
        } catch (error) {
          console.error('Error saving dropped image:', error);
          alert('Failed to save image');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error handling image drop:', error);
      alert('Failed to handle image');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <Toolbar
        onSave={handleSave}
        onOpen={handleOpenFile}
        onNew={handleNewNote}
        onExport={handleExport}
        onInsertImage={handleInsertImage}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          files={fileTree}
          onFileSelect={handleFileSelect}
          onOpenFolder={handleOpenFolder}
          onLoadChildren={handleLoadChildren}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* Editor */}
          {viewMode !== 'preview' && (
            <div className={viewMode === 'split' ? 'w-1/2' : 'w-full'}>
              <Editor
                ref={editorRef}
                value={editorContent}
                onChange={setEditorContent}
                onImageDrop={handleImageDrop}
              />
            </div>
          )}

          {/* Preview */}
          {viewMode !== 'edit' && (
            <div className={viewMode === 'split' ? 'w-1/2' : 'w-full'}>
              <Preview content={editorContent} />
            </div>
          )}
        </div>
      </div>

      {/* 欢迎屏幕 */}
      {!currentNote && editorContent === '' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 pointer-events-none">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              Markdown Notes
            </h1>
            <p className="text-gray-600 mb-8">
              Create and edit markdown documents with ease
            </p>
            <div className="flex gap-4 justify-center pointer-events-auto">
              <button
                onClick={handleNewNote}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                New Note
              </button>
              <button
                onClick={handleOpenFile}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Open File
              </button>
              <button
                onClick={handleOpenFolder}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Open Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
