import { create } from 'zustand';
import { Note, ViewMode, AppSettings } from '../types';

interface AppStore {
  // 当前笔记
  currentNote: Note | null;
  setCurrentNote: (note: Note | null) => void;
  
  // 笔记列表
  notes: Note[];
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  
  // 编辑器内容
  editorContent: string;
  setEditorContent: (content: string) => void;
  
  // 视图模式
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  
  // 文件树选中项
  selectedFilePath: string | null;
  setSelectedFilePath: (path: string | null) => void;
  
  // 侧边栏状态
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  
  // 设置
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  
  // 加载状态
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // 保存状态
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;
  
  // 未保存更改标记
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  currentNote: null,
  setCurrentNote: (note) => set({ currentNote: note }),
  
  notes: [],
  setNotes: (notes) => set({ notes }),
  addNote: (note) => set((state) => ({ notes: [...state.notes, note] })),
  updateNote: (id, updates) =>
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id ? { ...note, ...updates } : note
      ),
    })),
  deleteNote: (id) =>
    set((state) => ({
      notes: state.notes.filter((note) => note.id !== id),
    })),
  
  editorContent: '',
  setEditorContent: (content) => set({ editorContent: content }),
  
  viewMode: 'split',
  setViewMode: (mode) => set({ viewMode: mode }),
  
  selectedFilePath: null,
  setSelectedFilePath: (path) => set({ selectedFilePath: path }),
  
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  settings: {
    theme: 'light',
    autoSave: true,
    autoSaveInterval: 3000,
    defaultDirectory: '',
  },
  updateSettings: (updates) =>
    set((state) => ({
      settings: { ...state.settings, ...updates },
    })),
  
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  isSaving: false,
  setIsSaving: (saving) => set({ isSaving: saving }),
  
  hasUnsavedChanges: false,
  setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),
}));
