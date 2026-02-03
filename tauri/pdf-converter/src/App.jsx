import { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import FileDropZone from './components/FileDropZone';
import FormatSelector from './components/FormatSelector';
import ConversionPanel from './components/ConversionPanel';
import ConversionHistory from './components/ConversionHistory';
import AnimatedBackground from './components/AnimatedBackground';
import { useFileConverter } from './hooks/useFileConverter';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [targetFormat, setTargetFormat] = useState(null);
  const [activeTab, setActiveTab] = useState('convert');

  const {
    isConverting,
    progress,
    conversionHistory,
    convertFile,
    clearHistory,
    error,
    setError,
  } = useFileConverter();

  const handleFileSelect = useCallback((file) => {
    setSelectedFile(file);
    setError(null);
  }, [setError]);

  // 阻止 Tauri 窗口默认的拖放行为
  useEffect(() => {
    const preventDefault = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('dragover', preventDefault);
    document.addEventListener('drop', preventDefault);

    return () => {
      document.removeEventListener('dragover', preventDefault);
      document.removeEventListener('drop', preventDefault);
    };
  }, []);

  const handleConvert = useCallback(async () => {
    if (!selectedFile || !targetFormat) return;

    const result = await convertFile(selectedFile, targetFormat);
    if (result?.success) {
      // 转换成功后重置选择
      setSelectedFile(null);
      setTargetFormat(null);
    }
  }, [selectedFile, targetFormat, convertFile]);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setTargetFormat(null);
    setError(null);
  }, [setError]);

  return (
    <div className="min-h-screen relative">
      {/* 动画背景 */}
      <AnimatedBackground />

      {/* 网格背景 */}
      <div className="grid-bg fixed inset-0 -z-5 opacity-30" />

      {/* 主内容 */}
      <div className="relative z-10">
        <Header activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="container mx-auto px-4 py-8 max-w-6xl">
          {activeTab === 'convert' ? (
            <div className="space-y-8">
              {/* 标题区域 */}
              <div className="text-center space-y-4 animate-fade-in">
                <h1 className="text-4xl md:text-5xl font-bold font-display">
                  <span className="gradient-text">PDF 万能转换器</span>
                </h1>
                <p className="text-white/60 text-lg max-w-4xl mx-auto">
                  支持 PDF、Word、TXT、Markdown、HTML 等多种格式互相转换，
                  快速、安全、高效的文档转换工具
                </p>
              </div>

              {/* 主要内容区域 */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* 左侧 - 文件上传 */}
                <div className="space-y-6 animate-slide-up">
                  <FileDropZone
                    selectedFile={selectedFile}
                    onFileSelect={handleFileSelect}
                    onClearFile={handleClearFile}
                  />
                  
                </div>

                {/* 右侧 - 格式选择和转换 */}
                <div className="space-y-6 animate-slide-up animation-delay-100">
                  <FormatSelector
                    selectedFile={selectedFile}
                    targetFormat={targetFormat}
                    onFormatSelect={setTargetFormat}
                  />

                  <ConversionPanel
                    selectedFile={selectedFile}
                    targetFormat={targetFormat}
                    isConverting={isConverting}
                    progress={progress}
                    error={error}
                    onConvert={handleConvert}
                  />
                </div>
              </div>

              {/* 功能特点 */}
              <div className="grid md:grid-cols-3 gap-6 mt-12 animate-slide-up animation-delay-200">
                <FeatureCard
                  icon="⚡"
                  title="快速转换"
                  description="采用高效算法，秒级完成文档转换"
                />
                <FeatureCard
                  icon="🔒"
                  title="隐私安全"
                  description="本地处理，文件不上传到任何服务器"
                />
                <FeatureCard
                  icon="🎯"
                  title="格式丰富"
                  description="支持 PDF、DOC、TXT、MD、HTML 等多种格式"
                />
              </div>
            </div>
          ) : (
            <ConversionHistory
              history={conversionHistory}
              onClearHistory={clearHistory}
            />
          )}
        </main>

        {/* 页脚 */}
        <footer className="border-t border-white/10 mt-2 py-6">
          <div className="container mx-auto px-4 text-center text-white/40 text-sm">
            <p>PDF 万能转换器 v1.0.0 · 基于 Tauri v2 + React + Tailwind 构建</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

// 功能特点卡片组件
function FeatureCard({ icon, title, description }) {
  return (
    <div className="glass-card-hover p-6 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-white/60 text-sm">{description}</p>
    </div>
  );
}

export default App;
