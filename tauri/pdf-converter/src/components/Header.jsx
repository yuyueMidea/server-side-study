import React from 'react';
import { FileText, History, Settings, Sparkles } from 'lucide-react';

function Header({ activeTab, onTabChange }) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-dark-900/50 border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white text-lg">PDF Converter</h1>
              <p className="text-white/40 text-xs">万能文档转换器</p>
            </div>
          </div>

          {/* 导航标签 */}
          <nav className="flex items-center gap-2">
            <TabButton
              icon={<FileText className="w-4 h-4" />}
              label="转换"
              isActive={activeTab === 'convert'}
              onClick={() => onTabChange('convert')}
            />
            <TabButton
              icon={<History className="w-4 h-4" />}
              label="历史"
              isActive={activeTab === 'history'}
              onClick={() => onTabChange('history')}
            />
          </nav>

          {/* 设置按钮 */}
          <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
            <Settings className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
          </button>
        </div>
      </div>
    </header>
  );
}

function TabButton({ icon, label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300
        ${isActive 
          ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' 
          : 'text-white/60 hover:text-white hover:bg-white/5'
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default Header;
