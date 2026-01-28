export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  path: string;
}

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

export interface EditorState {
  content: string;
  cursorPosition: number;
}

export interface ExportOptions {
  format: 'pdf' | 'html' | 'markdown';
  includeCSS: boolean;
  fileName: string;
}

export type ViewMode = 'split' | 'edit' | 'preview';

export interface AppSettings {
  theme: 'light' | 'dark';
  autoSave: boolean;
  autoSaveInterval: number;
  defaultDirectory: string;
}
