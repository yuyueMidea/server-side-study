import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { Plus, Edit2, Trash2, Download, Upload, Search } from 'lucide-react';

function ContractManagement() {
    const [contracts, setContracts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContract, setEditingContract] = useState(null);
    const [formData, setFormData] = useState({
        contract_no: '',
        customer_name: '',
        title: '',
        amount: '',
        start_date: '',
        end_date: '',
        status: 'active',
        notes: ''
    });

    useEffect(() => {
        loadContracts();
    }, []);

    const loadContracts = async () => {
        try {
            const data = await invoke('get_all_contracts');
            setContracts(data);
        } catch (error) {
            console.error('加载合同失败:', error);
            alert('加载合同数据失败: ' + error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const contractData = {
                ...formData,
                amount: parseFloat(formData.amount) || 0
            };

            if (editingContract) {
                await invoke('update_contract', {
                    id: editingContract.id,
                    contract: contractData
                });
            } else {
                await invoke('create_contract', { contract: contractData });
            }
            loadContracts();
            closeModal();
        } catch (error) {
            console.error('保存合同失败:', error);
            alert('保存合同失败: ' + error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('确定要删除这个合同吗?')) {
            try {
                await invoke('delete_contract', { id });
                loadContracts();
            } catch (error) {
                console.error('删除合同失败:', error);
                alert('删除合同失败: ' + error);
            }
        }
    };

    const handleEdit = (contract) => {
        setEditingContract(contract);
        setFormData({
            contract_no: contract.contract_no,
            customer_name: contract.customer_name,
            title: contract.title,
            amount: contract.amount.toString(),
            start_date: contract.start_date,
            end_date: contract.end_date,
            status: contract.status,
            notes: contract.notes
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingContract(null);
        setFormData({
            contract_no: '',
            customer_name: '',
            title: '',
            amount: '',
            start_date: '',
            end_date: '',
            status: 'active',
            notes: ''
        });
    };

    const handleExport = async () => {
        try {
            const filePath = await save({
                filters: [{
                    name: 'CSV',
                    extensions: ['csv']
                }],
                defaultPath: 'contracts.csv'
            });

            if (filePath) {
                const csv = [
                    ['ID', '合同编号', '客户名称', '合同标题', '金额', '开始日期', '结束日期', '状态', '备注'].join(','),
                    ...contracts.map(c => [
                        c.id,
                        `"${c.contract_no}"`,
                        `"${c.customer_name}"`,
                        `"${c.title}"`,
                        c.amount,
                        c.start_date,
                        c.end_date,
                        c.status,
                        `"${c.notes}"`
                    ].join(','))
                ].join('\n');

                await writeTextFile(filePath, csv);
                alert('导出成功!');
            }
        } catch (error) {
            console.error('导出失败:', error);
            alert('导出失败: ' + error);
        }
    };

    const handleImport = async () => {
        try {
            const selected = await open({
                filters: [{
                    name: 'CSV',
                    extensions: ['csv']
                }],
                multiple: false
            });

            if (selected) {
                const content = await readTextFile(selected);
                const lines = content.split('\n').slice(1);

                for (const line of lines) {
                    if (line.trim()) {
                        const parts = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
                        if (parts.length >= 8) {
                            const contract = {
                                contract_no: parts[1].replace(/"/g, ''),
                                customer_name: parts[2].replace(/"/g, ''),
                                title: parts[3].replace(/"/g, ''),
                                amount: parseFloat(parts[4]) || 0,
                                start_date: parts[5].replace(/"/g, ''),
                                end_date: parts[6].replace(/"/g, ''),
                                status: parts[7].replace(/"/g, ''),
                                notes: parts[8] ? parts[8].replace(/"/g, '') : ''
                            };
                            await invoke('create_contract', { contract });
                        }
                    }
                }

                loadContracts();
                alert('导入成功!');
            }
        } catch (error) {
            console.error('导入失败:', error);
            alert('导入失败: ' + error);
        }
    };

    const filteredContracts = contracts.filter(contract =>
        contract.contract_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'expired': return 'bg-red-100 text-red-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'active': return '执行中';
            case 'expired': return '已过期';
            case 'pending': return '待执行';
            default: return status;
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* 头部 */}
            <div className="p-6 border-b">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">合同管理</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={handleImport}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                            导入
                        </button>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            导出
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            新增合同
                        </button>
                    </div>
                </div>

                {/* 搜索框 */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="搜索合同编号、客户名称或标题..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* 表格 */}
            <div className="flex-1 overflow-auto p-6">
                <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">合同编号</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">客户名称</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">合同标题</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">开始日期</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">结束日期</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredContracts.map((contract) => (
                            <tr key={contract.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{contract.contract_no}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contract.customer_name}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{contract.title}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">¥{contract.amount.toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contract.start_date}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contract.end_date}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(contract.status)}`}>
                                        {getStatusText(contract.status)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                        onClick={() => handleEdit(contract)}
                                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(contract.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 模态框 */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">
                            {editingContract ? '编辑合同' : '新增合同'}
                        </h3>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        合同编号 *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.contract_no}
                                        onChange={(e) => setFormData({ ...formData, contract_no: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        客户名称 *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.customer_name}
                                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        合同标题 *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        金额 (元) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        状态 *
                                    </label>
                                    <select
                                        required
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="pending">待执行</option>
                                        <option value="active">执行中</option>
                                        <option value="expired">已过期</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        开始日期 *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        结束日期 *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    备注
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows="3"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                >
                                    保存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ContractManagement;