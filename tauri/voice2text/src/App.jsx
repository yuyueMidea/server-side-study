import React, { useState, useEffect } from 'react';
import { Settings, Mic, List } from 'lucide-react';
import Recorder from './components/Recorder';
import TranscriptList from './components/TranscriptList';
import SettingsPanel from './components/Settings.jsx';
import { loadTranscripts, saveTranscripts } from './utils/storage';
import { listen } from '@tauri-apps/api/event';

function App() {
  const [view, setView] = useState('recorder');
  const [transcripts, setTranscripts] = useState([]);
  const [settings, setSettings] = useState({
    language: 'zh-CN',
    autoCopy: true,
    continuous: false
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await loadTranscripts();
        if (data && Array.isArray(data)) {
          setTranscripts(data);
        }
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    let unlisten;
    const setupListener = async () => {
      try {
        unlisten = await listen('toggle-recording', () => {
          console.log('收到全局快捷键事件');
          setView('recorder');
        });
      } catch (error) {
        console.error('设置事件监听失败:', error);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  const addTranscript = async (transcript) => {
    if (!transcript || transcript.trim() === '') {
      console.warn('空文本不会被保存');
      return;
    }

    const newTranscript = {
      id: Date.now(),
      text: transcript.trim(),
      timestamp: new Date().toISOString(),
      language: settings.language
    };

    const newTranscripts = [newTranscript, ...transcripts];
    setTranscripts(newTranscripts);

    saveTranscripts(newTranscripts).catch(error => {
      console.error('保存失败:', error);
    });
  };

  const deleteTranscript = async (id) => {
    const newTranscripts = transcripts.filter(t => t.id !== id);
    setTranscripts(newTranscripts);

    saveTranscripts(newTranscripts).catch(error => {
      console.error('保存失败:', error);
    });
  };

  const clearAllTranscripts = async () => {
    if (transcripts.length === 0) {
      return;
    }

    if (window.confirm('确定要清空所有历史记录吗?此操作不可恢复!')) {
      setTranscripts([]);

      saveTranscripts([]).catch(error => {
        console.error('保存失败:', error);
      });
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="text-2xl font-semibold text-indigo-600 mb-2">加载中...</div>
          <div className="text-gray-600">正在初始化应用</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-md">
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold text-indigo-600">语音转文本</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setView('recorder')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${view === 'recorder'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <Mic size={20} />
              录音
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${view === 'list'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <List size={20} />
              历史记录
            </button>
            <button
              onClick={() => setView('settings')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${view === 'settings'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <Settings size={20} />
              设置
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden">
        {view === 'recorder' && (
          <Recorder
            onTranscriptComplete={addTranscript}
            settings={settings}
          />
        )}
        {view === 'list' && (
          <TranscriptList
            transcripts={transcripts}
            onDelete={deleteTranscript}
            onClearAll={clearAllTranscripts}
          />
        )}
        {view === 'settings' && (
          <SettingsPanel
            settings={settings}
            onSettingsChange={setSettings}
          />
        )}
      </main>

      <div className="bg-indigo-600 text-white text-center py-2 text-sm">
        按 Ctrl+Shift+Space 唤醒录音窗口
      </div>
    </div>
  );
}

export default App;