import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { homeDir, join } from '@tauri-apps/api/path';

const useStore = create((set, get) => ({
  // 文件树
  files: [],
  currentFile: null,
  currentContent: '',
  isSaving: false,
  lastSaved: null,
  notesDir: null,
  
  // UI 状态
  showPreview: true,
  sidebarOpen: true,
  
  // 初始化笔记目录
  initNotesDir: async () => {
    try {
      const home = await homeDir();
      const notesPath = await join(home, 'MarkdownNotes');
      set({ notesDir: notesPath });
      return notesPath;
    } catch (error) {
      console.error('Failed to initialize notes directory:', error);
      throw error;
    }
  },
  
  // 加载文件列表
  loadFiles: async () => {
    try {
      const { notesDir } = get();
      if (!notesDir) {
        await get().initNotesDir();
      }
      const dir = get().notesDir;
      const fileList = await invoke('list_files', { dirPath: dir });
      set({ files: fileList });
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  },
  
  // 打开文件
  openFile: async (filePath) => {
    try {
      const content = await invoke('read_file', { path: filePath });
      set({ 
        currentFile: filePath, 
        currentContent: content,
        lastSaved: new Date()
      });
    } catch (error) {
      console.error('Failed to open file:', error);
      throw error;
    }
  },
  
  // 保存文件
  saveFile: async () => {
    const { currentFile, currentContent } = get();
    if (!currentFile) return;
    
    try {
      set({ isSaving: true });
      await invoke('write_file', { 
        path: currentFile, 
        content: currentContent 
      });
      set({ 
        lastSaved: new Date(),
        isSaving: false 
      });
    } catch (error) {
      console.error('Failed to save file:', error);
      set({ isSaving: false });
      throw error;
    }
  },
  
  // 创建新文件
  createFile: async (fileName) => {
    try {
      const { notesDir } = get();
      const filePath = await join(notesDir, fileName.endsWith('.md') ? fileName : `${fileName}.md`);
      await invoke('create_file', { path: filePath });
      await get().loadFiles();
      await get().openFile(filePath);
    } catch (error) {
      console.error('Failed to create file:', error);
      throw error;
    }
  },
  
  // 删除文件
  deleteFile: async (filePath) => {
    try {
      await invoke('delete_file', { path: filePath });
      if (get().currentFile === filePath) {
        set({ currentFile: null, currentContent: '' });
      }
      await get().loadFiles();
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  },
  
  // 更新内容
  updateContent: (content) => {
    set({ currentContent: content });
  },
  
  // 导出 HTML
  exportAsHtml: async (outputPath) => {
    const { currentContent } = get();
    try {
      await invoke('export_html', { 
        markdown: currentContent, 
        outputPath 
      });
    } catch (error) {
      console.error('Failed to export HTML:', error);
      throw error;
    }
  },
  
  // 导出 PDF
  exportAsPdf: async (outputPath) => {
    const { currentContent } = get();
    try {
      await invoke('export_pdf', { 
        markdown: currentContent, 
        outputPath 
      });
    } catch (error) {
      console.error('Failed to export PDF:', error);
      throw error;
    }
  },
  
  // 保存图片
  saveImage: async (base64Data, filename) => {
    const { notesDir } = get();
    try {
      const imagePath = await invoke('save_image', { 
        base64Data, 
        filename,
        notesDir 
      });
      return imagePath;
    } catch (error) {
      console.error('Failed to save image:', error);
      throw error;
    }
  },
  
  // 切换预览
  togglePreview: () => {
    set((state) => ({ showPreview: !state.showPreview }));
  },
  
  // 切换侧边栏
  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },
}));

export default useStore;
