import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { Plus, Edit2, Trash2, Download, Upload, Search } from 'lucide-react';

function EquipmentManagement() {
    const [equipment, setEquipment] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEquipment, setEditingEquipment] = useState(null);
    const [formData, setFormData] = useState({
        asset_no: '',
        name: '',
        category: '',
        model: '',
        manufacturer: '',
        purchase_date: '',
        price: '',
        location: '',
        status: 'normal',
        notes: ''
    });

    useEffect(() => {
        loadEquipment();
    }, []);

    const loadEquipment = async () => {
        try {
            const data = await invoke('get_all_equipment');
            setEquipment(data);
        } catch (error) {
            console.error('加载设备失败:', error);
            alert('加载设备数据失败: ' + error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const equipmentData = {
                ...formData,
                price: parseFloat(formData.price) || 0
            };

            if (editingEquipment) {
                await invoke('update_equipment', {
                    id: editingEquipment.id,
                    equipment: equipmentData
                });
            } else {
                await invoke('create_equipment', { equipment: equipmentData });
            }
            loadEquipment();
            closeModal();
        } catch (error) {
            console.error('保存设备失败:', error);
            alert('保存设备失败: ' + error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('确定要删除这个设备吗?')) {
            try {
                await invoke('delete_equipment', { id });
                loadEquipment();
            } catch (error) {
                console.error('删除设备失败:', error);
                alert('删除设备失败: ' + error);
            }
        }
    };

    const handleEdit = (item) => {
        setEditingEquipment(item);
        setFormData({
            asset_no: item.asset_no,
            name: item.name,
            category: item.category,
            model: item.model,
            manufacturer: item.manufacturer,
            purchase_date: item.purchase_date,
            price: item.price.toString(),
            location: item.location,
            status: item.status,
            notes: item.notes
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingEquipment(null);
        setFormData({
            asset_no: '',
            name: '',
            category: '',
            model: '',
            manufacturer: '',
            purchase_date: '',
            price: '',
            location: '',
            status: 'normal',
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
                defaultPath: 'equipment.csv'
            });

            if (filePath) {
                const csv = [
                    ['ID', '资产编号', '设备名称', '分类', '型号', '制造商', '购买日期', '价格', '存放位置', '状态', '备注'].join(','),
                    ...equipment.map(e => [
                        e.id,
                        `"${e.asset_no}"`,
                        `"${e.name}"`,
                        `"${e.category}"`,
                        `"${e.model}"`,
                        `"${e.manufacturer}"`,
                        e.purchase_date,
                        e.price,
                        `"${e.location}"`,
                        e.status,
                        `"${e.notes}"`
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
                        if (parts.length >= 10) {
                            const equipmentData = {
                                asset_no: parts[1].replace(/"/g, ''),
                                name: parts[2].replace(/"/g, ''),
                                category: parts[3].replace(/"/g, ''),
                                model: parts[4].replace(/"/g, ''),
                                manufacturer: parts[5].replace(/"/g, ''),
                                purchase_date: parts[6].replace(/"/g, ''),
                                price: parseFloat(parts[7]) || 0,
                                location: parts[8].replace(/"/g, ''),
                                status: parts[9].replace(/"/g, ''),
                                notes: parts[10] ? parts[10].replace(/"/g, '') : ''
                            };
                            await invoke('create_equipment', { equipment: equipmentData });
                        }
                    }
                }

                loadEquipment();
                alert('导入成功!');
            }
        } catch (error) {
            console.error('导入失败:', error);
            alert('导入失败: ' + error);
        }
    };

    const filteredEquipment = equipment.filter(item =>
        item.asset_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'normal': return 'bg-green-100 text-green-800';
            case 'maintenance': return 'bg-yellow-100 text-yellow-800';
            case 'damaged': return 'bg-red-100 text-red-800';
            case 'retired': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'normal': return '正常';
            case 'maintenance': return '维护中';
            case 'damaged': return '损坏';
            case 'retired': return '已报废';
            default: return status;
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* 头部 */}
            <div className="p-6 border-b">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">设备台账</h2>
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
                            新增设备
                        </button>
                    </div>
                </div>

                {/* 搜索框 */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="搜索资产编号、设备名称、分类或位置..."
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">资产编号</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">设备名称</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分类</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">型号</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">制造商</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">购买日期</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">价格</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">位置</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredEquipment.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.asset_no}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.model}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.manufacturer}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.purchase_date}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">¥{item.price.toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.location}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>
                                        {getStatusText(item.status)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
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
                    <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">
                            {editingEquipment ? '编辑设备' : '新增设备'}
                        </h3>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        资产编号 *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.asset_no}
                                        onChange={(e) => setFormData({ ...formData, asset_no: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        设备名称 *
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
                                        分类 *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="如：电脑、打印机、服务器等"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        型号
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.model}
                                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        制造商
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.manufacturer}
                                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        购买日期 *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.purchase_date}
                                        onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        价格 (元) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        存放位置 *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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
                                        <option value="normal">正常</option>
                                        <option value="maintenance">维护中</option>
                                        <option value="damaged">损坏</option>
                                        <option value="retired">已报废</option>
                                    </select>
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

export default EquipmentManagement;