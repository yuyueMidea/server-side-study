import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, readDir, exists, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs';
import { Note, FileNode } from '../types';

// 文件操作相关
export const fileApi = {
  // 读取文件
  async readFile(path: string): Promise<string> {
    try {
      const content = await readTextFile(path);
      return content;
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  },

  // 写入文件
  async writeFile(path: string, content: string): Promise<void> {
    try {
      await writeTextFile(path, content);
    } catch (error) {
      console.error('Error writing file:', error);
      throw error;
    }
  },

  // 选择文件
  async selectFile(): Promise<string | null> {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Markdown',
            extensions: ['md', 'markdown'],
          },
          {
            name: 'Text',
            extensions: ['txt'],
          },
        ],
      });
      return selected as string | null;
    } catch (error) {
      console.error('Error selecting file:', error);
      return null;
    }
  },

  // 保存文件对话框
  async saveFileDialog(defaultName: string = 'untitled.md'): Promise<string | null> {
    try {
      const path = await save({
        defaultPath: defaultName,
        filters: [
          {
            name: 'Markdown',
            extensions: ['md'],
          },
        ],
      });
      return path;
    } catch (error) {
      console.error('Error in save dialog:', error);
      return null;
    }
  },

  // 选择文件夹
  async selectDirectory(): Promise<string | null> {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      return selected as string | null;
    } catch (error) {
      console.error('Error selecting directory:', error);
      return null;
    }
  },

  // 读取目录
  async readDirectory(path: string): Promise<FileNode[]> {
    try {
      const entries = await readDir(path, { recursive: false });
      const nodes: FileNode[] = [];

      for (const entry of entries) {
        const node: FileNode = {
          name: entry.name || '',
          path: `${path}/${entry.name}`,
          isDirectory: entry.isDirectory,
        };

        if (entry.isDirectory) {
          node.children = [];
        }

        nodes.push(node);
      }

      return nodes.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error('Error reading directory:', error);
      return [];
    }
  },

  // 检查文件是否存在
  async fileExists(path: string): Promise<boolean> {
    try {
      return await exists(path);
    } catch (error) {
      return false;
    }
  },

  // 创建目录
  async createDirectory(path: string): Promise<void> {
    try {
      await mkdir(path, { recursive: true });
    } catch (error) {
      console.error('Error creating directory:', error);
      throw error;
    }
  },
};

// 笔记操作相关
export const noteApi = {
  // 创建新笔记
  async createNote(title: string, content: string, path: string): Promise<Note> {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    
    const note: Note = {
      id,
      title,
      content,
      created_at: now,
      updated_at: now,
      path,
    };

    await fileApi.writeFile(path, content);
    return note;
  },

  // 更新笔记
  async updateNote(note: Note): Promise<Note> {
    const updatedNote = {
      ...note,
      updated_at: new Date().toISOString(),
    };

    await fileApi.writeFile(note.path, note.content);
    return updatedNote;
  },

  // 从文件加载笔记
  async loadNote(path: string): Promise<Note> {
    const content = await fileApi.readFile(path);
    const fileName = path.split('/').pop() || 'untitled.md';
    const title = fileName.replace('.md', '').replace('.markdown', '');

    return {
      id: Date.now().toString(),
      title,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      path,
    };
  },
};

// 导出相关
export const exportApi = {
  // 导出为 HTML
  async exportToHtml(content: string, filePath: string): Promise<void> {
    try {
      await invoke('export_to_html', { content, filePath });
    } catch (error) {
      console.error('Error exporting to HTML:', error);
      throw error;
    }
  },

  // 导出为 PDF
  async exportToPdf(content: string, filePath: string): Promise<void> {
    try {
      await invoke('export_to_pdf', { content, filePath });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    }
  },

  // 导出为 Markdown
  async exportToMarkdown(content: string, filePath: string): Promise<void> {
    try {
      await fileApi.writeFile(filePath, content);
    } catch (error) {
      console.error('Error exporting to Markdown:', error);
      throw error;
    }
  },
};

// 图片处理相关
export const imageApi = {
  // 保存图片到本地
  async saveImage(imageData: string, fileName: string, directory: string): Promise<string> {
    try {
      const imagePath = `${directory}/${fileName}`;
      
      // 如果是 base64 数据，需要转换
      if (imageData.startsWith('data:image')) {
        const base64Data = imageData.split(',')[1];
        await invoke('save_base64_image', { 
          data: base64Data, 
          path: imagePath 
        });
      } else {
        // 如果是文件路径，直接复制
        await invoke('copy_image', { 
          sourcePath: imageData, 
          destPath: imagePath 
        });
      }
      
      return imagePath;
    } catch (error) {
      console.error('Error saving image:', error);
      throw error;
    }
  },

  // 选择图片
  async selectImage(): Promise<string | null> {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Images',
            extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
          },
        ],
      });
      return selected as string | null;
    } catch (error) {
      console.error('Error selecting image:', error);
      return null;
    }
  },
};
