import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// 格式化字节大小
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
};

// 格式化时间
const formatUptime = (seconds) => {
  if (!seconds) return '0天 0小时 0分钟';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}天 ${hours}小时 ${minutes}分钟`;
};

// 仪表盘组件
const Dashboard = ({ systemInfo, cpuHistory, memoryHistory }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU 使用率 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">CPU 使用率</p>
              <p className="text-3xl font-bold text-blue-600">
                {systemInfo.cpu_usage?.toFixed(1) || 0}%
              </p>
            </div>
            <div className="text-4xl">💻</div>
          </div>
        </div>

        {/* 内存使用 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">内存使用</p>
              <p className="text-3xl font-bold text-green-600">
                {systemInfo.memory_percentage?.toFixed(1) || 0}%
              </p>
              <p className="text-xs text-gray-500">
                {formatBytes(systemInfo.memory_used)} / {formatBytes(systemInfo.memory_total)}
              </p>
            </div>
            <div className="text-4xl">🧠</div>
          </div>
        </div>

        {/* 进程数 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">运行进程</p>
              <p className="text-3xl font-bold text-purple-600">
                {systemInfo.process_count || 0}
              </p>
            </div>
            <div className="text-4xl">⚙️</div>
          </div>
        </div>

        {/* 运行时间 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">系统运行</p>
              <p className="text-sm font-bold text-orange-600">
                {formatUptime(systemInfo.uptime || 0)}
              </p>
            </div>
            <div className="text-4xl">⏱️</div>
          </div>
        </div>
      </div>

      {/* CPU 历史图表 */}
      {cpuHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">CPU 使用率历史</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={cpuHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(ts) => new Date(ts * 1000).toLocaleTimeString()}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                labelFormatter={(ts) => new Date(ts * 1000).toLocaleTimeString()}
                formatter={(value) => [`${value.toFixed(1)}%`, 'CPU']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="usage" 
                stroke="#0088FE" 
                name="CPU 使用率"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 内存历史图表 */}
      {memoryHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">内存使用历史</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={memoryHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(ts) => new Date(ts * 1000).toLocaleTimeString()}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                labelFormatter={(ts) => new Date(ts * 1000).toLocaleTimeString()}
                formatter={(value) => [`${value.toFixed(1)}%`, '内存']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="percentage" 
                stroke="#00C49F" 
                name="内存使用率"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 磁盘信息 */}
      {systemInfo.disk_info && systemInfo.disk_info.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">磁盘使用情况</h3>
          <div className="space-y-4">
            {systemInfo.disk_info.map((disk, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{disk.mount_point}</span>
                  <span className="text-gray-600">
                    {formatBytes(disk.total_space - disk.available_space)} / {formatBytes(disk.total_space)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${disk.used_percentage}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {disk.used_percentage.toFixed(1)}% 已使用
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 网络统计 */}
      {systemInfo.network_stats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">网络统计</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">下载速度</p>
              <p className="text-2xl font-bold text-green-600">
                {formatBytes(systemInfo.network_stats.received_rate || 0)}/s
              </p>
              <p className="text-xs text-gray-500">
                总计: {formatBytes(systemInfo.network_stats.total_received || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">上传速度</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatBytes(systemInfo.network_stats.transmitted_rate || 0)}/s
              </p>
              <p className="text-xs text-gray-500">
                总计: {formatBytes(systemInfo.network_stats.total_transmitted || 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 清理工具组件
const CleanerTool = () => {
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState(null);

  const handleClean = async () => {
    setCleaning(true);
    setResult(null);
    
    try {
      const res = await invoke('clean_temp_files');
      setResult(res);
    } catch (error) {
      console.error('清理失败:', error);
      setResult({ error: error.toString() });
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">系统清理</h3>
      
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700 mb-2">
            清理临时文件可以释放磁盘空间,提高系统性能。
          </p>
          <p className="text-xs text-gray-600">
            将清理: 临时文件夹、系统缓存、预取文件等
          </p>
        </div>

        <button
          onClick={handleClean}
          disabled={cleaning}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
            cleaning
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {cleaning ? '清理中...' : '开始清理'}
        </button>

        {result && (
          <div className={`p-4 rounded-lg ${result.error ? 'bg-red-50' : 'bg-green-50'}`}>
            {result.error ? (
              <p className="text-red-700">清理失败: {result.error}</p>
            ) : (
              <div>
                <p className="font-semibold text-green-700 mb-2">清理完成!</p>
                <p className="text-sm text-gray-700">
                  删除文件: {result.files_removed} 个
                </p>
                <p className="text-sm text-gray-700">
                  释放空间: {formatBytes(result.space_freed)}
                </p>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600">部分错误:</p>
                    {result.errors.slice(0, 3).map((err, i) => (
                      <p key={i} className="text-xs text-gray-500">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// 大文件查找组件
const LargeFileFinder = () => {
  const [scanning, setScanning] = useState(false);
  const [files, setFiles] = useState([]);
  const [scanPath, setScanPath] = useState('C:\\Users');
  const [minSize, setMinSize] = useState(100);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    let unlisten;
    
    listen('scan-progress', (event) => {
      setProgress(event.payload);
    }).then(fn => {
      unlisten = fn;
    });
    
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleScan = async () => {
    setScanning(true);
    setFiles([]);
    setProgress(null);

    try {
      const result = await invoke('find_large_files', {
        path: scanPath,
        minSizeMb: minSize
      });
      setFiles(result || []);
    } catch (error) {
      console.error('扫描失败:', error);
      alert('扫描失败: ' + error);
    } finally {
      setScanning(false);
      setProgress(null);
    }
  };

  const handleDelete = async (filePath) => {
    if (window.confirm(`确定要删除这个文件吗?\n${filePath}`)) {
      try {
        await invoke('delete_file', { path: filePath });
        setFiles(files.filter(f => f.path !== filePath));
      } catch (error) {
        alert('删除失败: ' + error);
      }
    }
  };

  const handleOpenLocation = async (filePath) => {
    try {
      await invoke('open_file_location', { path: filePath });
    } catch (error) {
      alert('打开位置失败: ' + error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">大文件查找</h3>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            扫描路径
          </label>
          <input
            type="text"
            value={scanPath}
            onChange={(e) => setScanPath(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入要扫描的路径"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            最小文件大小 (MB)
          </label>
          <input
            type="number"
            value={minSize}
            onChange={(e) => setMinSize(parseInt(e.target.value) || 100)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="1"
          />
        </div>

        <button
          onClick={handleScan}
          disabled={scanning}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
            scanning
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {scanning ? '扫描中...' : '开始扫描'}
        </button>

        {progress && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              已扫描: {progress.files_scanned} 个文件
            </p>
            <p className="text-xs text-gray-600 truncate">
              当前: {progress.current_path}
            </p>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">
            找到 {files.length} 个大文件
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {files.map((file, index) => (
              <div 
                key={index}
                className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" title={file.path}>
                      {file.path.split(/[/\\]/).pop()}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {file.path}
                    </p>
                  </div>
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                    {file.size_formatted}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenLocation(file.path)}
                    className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    打开位置
                  </button>
                  <button
                    onClick={() => handleDelete(file.path)}
                    className="text-xs px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 主应用组件
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [systemInfo, setSystemInfo] = useState({});
  const [cpuHistory, setCpuHistory] = useState([]);
  const [memoryHistory, setMemoryHistory] = useState([]);

  useEffect(() => {
    // 初始加载
    loadSystemInfo();

    // 监听实时更新
    let unlisten;
    listen('system-info-update', (event) => {
      setSystemInfo(event.payload);
    }).then(fn => {
      unlisten = fn;
    }).catch(err => {
      console.error('监听事件失败:', err);
    });

    // 定时获取历史数据
    const interval = setInterval(async () => {
      try {
        const cpu = await invoke('get_cpu_history');
        const mem = await invoke('get_memory_history');
        if (cpu) setCpuHistory(cpu);
        if (mem) setMemoryHistory(mem);
      } catch (error) {
        console.error('获取历史数据失败:', error);
      }
    }, 2000);

    return () => {
      if (unlisten) unlisten();
      clearInterval(interval);
    };
  }, []);

  const loadSystemInfo = async () => {
    try {
      const info = await invoke('get_current_system_info');
      if (info) setSystemInfo(info);
    } catch (error) {
      console.error('获取系统信息失败:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 头部 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            系统监控与清理工具
          </h1>
        </div>
      </header>

      {/* 标签页 */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            📊 仪表盘
          </button>
          <button
            onClick={() => setActiveTab('cleaner')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'cleaner'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            🧹 系统清理
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'files'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            📁 大文件查找
          </button>
        </div>

        {/* 内容区域 */}
        <div>
          {activeTab === 'dashboard' && (
            <Dashboard 
              systemInfo={systemInfo}
              cpuHistory={cpuHistory}
              memoryHistory={memoryHistory}
            />
          )}
          {activeTab === 'cleaner' && <CleanerTool />}
          {activeTab === 'files' && <LargeFileFinder />}
        </div>
      </div>
    </div>
  );
}