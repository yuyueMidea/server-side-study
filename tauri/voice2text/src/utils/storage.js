import { BaseDirectory, exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

const STORAGE_FILE = 'transcripts.json';

export async function loadTranscripts() {
  try {
    const fileExists = await exists(STORAGE_FILE, {
      baseDir: BaseDirectory.AppData
    });

    if (!fileExists) {
      console.log('历史记录文件不存在,返回空数组');
      return [];
    }

    const content = await readTextFile(STORAGE_FILE, {
      baseDir: BaseDirectory.AppData
    });

    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('加载历史记录失败:', error);
    return [];
  }
}

export async function saveTranscripts(transcripts) {
  try {
    if (!Array.isArray(transcripts)) {
      console.error('saveTranscripts 参数必须是数组');
      return false;
    }

    await writeTextFile(STORAGE_FILE, JSON.stringify(transcripts, null, 2), {
      baseDir: BaseDirectory.AppData
    });

    console.log('历史记录保存成功,共', transcripts.length, '条');
    return true;
  } catch (error) {
    console.error('保存历史记录失败:', error);
    return false;
  }
}

export async function clearTranscripts() {
  return await saveTranscripts([]);
}
