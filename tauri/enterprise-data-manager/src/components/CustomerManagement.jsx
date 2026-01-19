import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { Plus, Edit2, Trash2, Download, Upload, Search } from 'lucide-react';

function CustomerManagement() {
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        contact: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
    });

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        try {
            const data = await invoke('get_all_customers');
            setCustomers(data);
        } catch (error) {
            console.error('加载客户失败:', error);
            alert('加载客户数据失败: ' + error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCustomer) {
                await invoke('update_customer', {
                    id: editingCustomer.id,
                    customer: formData
                });
            } else {
                await invoke('create_customer', { customer: formData });
            }
            loadCustomers();
            closeModal();
        } catch (error) {
            console.error('保存客户失败:', error);
            alert('保存客户失败: ' + error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('确定要删除这个客户吗?')) {
            try {
                await invoke('delete_customer', { id });
                loadCustomers();
            } catch (error) {
                console.error('删除客户失败:', error);
                alert('删除客户失败: ' + error);
            }
        }
    };

    const handleEdit = (customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name,
            contact: customer.contact,
            phone: customer.phone,
            email: customer.email,
            address: customer.address,
            notes: customer.notes
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCustomer(null);
        setFormData({
            name: '',
            contact: '',
            phone: '',
            email: '',
            address: '',
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
                defaultPath: 'customers.csv'
            });

            if (filePath) {
                const csv = [
                    ['ID', '公司名称', '联系人', '电话', '邮箱', '地址', '备注'].join(','),
                    ...customers.map(c => [
                        c.id,
                        `"${c.name}"`,
                        `"${c.contact}"`,
                        c.phone,
                        c.email,
                        `"${c.address}"`,
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
                const lines = content.split('\n').slice(1); // 跳过标题行

                for (const line of lines) {
                    if (line.trim()) {
                        const parts = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
                        if (parts.length >= 6) {
                            const customer = {
                                name: parts[1].replace(/"/g, ''),
                                contact: parts[2].replace(/"/g, ''),
                                phone: parts[3].replace(/"/g, ''),
                                email: parts[4].replace(/"/g, ''),
                                address: parts[5].replace(/"/g, ''),
                                notes: parts[6] ? parts[6].replace(/"/g, '') : ''
                            };
                            await invoke('create_customer', { customer });
                        }
                    }
                }

                loadCustomers();
                alert('导入成功!');
            }
        } catch (error) {
            console.error('导入失败:', error);
            alert('导入失败: ' + error);
        }
    };

    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm)
    );

    return (
        <div className="flex flex-col h-full bg-white">
            {/* 头部 */}
            <div className="p-6 border-b">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">客户管理</h2>
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
                            新增客户
                        </button>
                    </div>
                </div>

                {/* 搜索框 */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="搜索客户名称、联系人或电话..."
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">公司名称</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">联系人</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">电话</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">邮箱</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">地址</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredCustomers.map((customer) => (
                            <tr key={customer.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.contact}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.phone}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.email}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{customer.address}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                        onClick={() => handleEdit(customer)}
                                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(customer.id)}
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
                            {editingCustomer ? '编辑客户' : '新增客户'}
                        </h3>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        公司名称 *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        联系人 *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.contact}
                                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        电话 *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        邮箱
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    地址
                                </label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
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

export default CustomerManagement;