import React, { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import Editor from './components/Editor';
import Preview from './components/Preview';
import useStore from './store/useStore';
import useAutoSave from './hooks/useAutoSave';

function App() {
  const { initNotesDir, loadFiles, sidebarOpen, showPreview } = useStore();
  
  // 自动保存功能
  useAutoSave(2000);

  useEffect(() => {
    // 初始化应用
    const init = async () => {
      try {
        await initNotesDir();
        await loadFiles();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };
    
    init();
  }, [initNotesDir, loadFiles]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Toolbar />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 flex overflow-hidden">
          <Editor />
          {showPreview && <Preview />}
        </div>
      </div>
    </div>
  );
}

export default App;
