import React, { useState } from 'react';
import { Users, FileText, Monitor } from 'lucide-react';
import CustomerManagement from './components/CustomerManagement';
import ContractManagement from './components/ContractManagement';
import EquipmentManagement from './components/EquipmentManagement';

function App() {
  const [activeTab, setActiveTab] = useState('customers');

  const tabs = [
    { id: 'customers', name: '客户管理', icon: Users, component: CustomerManagement },
    { id: 'contracts', name: '合同管理', icon: FileText, component: ContractManagement },
    { id: 'equipment', name: '设备台账', icon: Monitor, component: EquipmentManagement },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 侧边栏 */}
      <div className="w-64 bg-gradient-to-b from-blue-600 to-blue-700 text-white">
        <div className="p-6">
          <h1 className="text-2xl font-bold">企业数据管理</h1>
          <p className="text-blue-200 text-sm mt-1">Enterprise Data Manager</p>
        </div>

        <nav className="mt-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-6 py-4 transition-colors ${activeTab === tab.id
                    ? 'bg-blue-800 border-l-4 border-white'
                    : 'hover:bg-blue-700'
                  }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span className="font-medium">{tab.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 w-64 p-6 border-t border-blue-500">
          <p className="text-sm text-blue-200">© 2024 企业数据管理系统</p>
          <p className="text-xs text-blue-300 mt-1">Powered by Tauri + React</p>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-hidden">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}

export default App;