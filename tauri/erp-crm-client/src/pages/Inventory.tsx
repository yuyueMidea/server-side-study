import { useState, useMemo } from 'react';
import { Button, Input, SearchInput, Select, Card, Table, Modal, StatusBadge, Pagination, ConfirmDialog, Alert } from '@/components/common';
import { useInventoryStore } from '@/store';
import { useModal, usePagination, useForm, useScanner } from '@/hooks';
import { formatCurrency, cn } from '@/utils';
import { Plus, Download, Trash2, Eye, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Wifi, WifiOff } from 'lucide-react';
import type { Product, ProductStatus } from '@/types';

// 模拟数据
const mockProducts: Product[] = Array.from({ length: 50 }, (_, i) => ({
  id: `prod-${i + 1}`,
  code: `P${String(i + 1).padStart(5, '0')}`,
  barcode: `69${String(i + 1).padStart(11, '0')}`,
  name: ['笔记本电脑', '打印机', '办公椅', '显示器', '键盘鼠标套装', '复印纸', '文件夹', '订书机'][i % 8],
  category: ['电子产品', '办公设备', '办公家具', '耗材'][i % 4],
  unit: ['台', '个', '把', '箱', '套'][i % 5],
  specification: `规格型号 ${i + 1}`,
  brand: ['联想', '惠普', '戴尔', '华为', '小米'][i % 5],
  costPrice: 1000 + i * 100,
  sellPrice: 1500 + i * 150,
  minStock: 10,
  maxStock: 1000,
  currentStock: Math.floor(Math.random() * 100),
  warehouseId: 'wh-1',
  location: `A区-${Math.floor(i / 10) + 1}排-${(i % 10) + 1}号`,
  status: (['active', 'discontinued', 'out_of_stock'] as ProductStatus[])[i % 3],
  description: '产品描述信息',
  createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  updatedAt: new Date().toISOString(),
}));

const categoryOptions = [
  { value: '', label: '全部类型' },
  { value: '电子产品', label: '电子产品' },
  { value: '办公设备', label: '办公设备' },
  { value: '办公家具', label: '办公家具' },
  { value: '耗材', label: '耗材' },
];

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'active', label: '正常' },
  { value: 'discontinued', label: '已停产' },
  { value: 'out_of_stock', label: '缺货' },
];

export function InventoryPage() {
  const { searchKeyword, setSearchKeyword, filters, setFilters, lastScanResult, scannerConnected } = useInventoryStore();
  const [products] = useState<Product[]>(mockProducts);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockOperation, setStockOperation] = useState<'in' | 'out' | null>(null);

  const createModal = useModal();
  const detailModal = useModal();
  const deleteModal = useModal();
  const stockModal = useModal();
  const scannerModal = useModal();

  const { connect, disconnect, clearLastScan } = useScanner();

  const form = useForm({
    name: '', code: '', barcode: '', category: '', unit: '',
    specification: '', brand: '', costPrice: 0, sellPrice: 0,
    minStock: 10, maxStock: 1000, location: '', description: '',
  });

  const stockForm = useForm({ quantity: 0, unitPrice: 0, remark: '' });

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = !searchKeyword ||
        p.name.includes(searchKeyword) ||
        p.code.includes(searchKeyword) ||
        p.barcode.includes(searchKeyword);
      const matchesCategory = !filters.category || p.category === filters.category;
      const matchesStatus = !filters.status || p.status === filters.status;
      const matchesLowStock = !filters.lowStock || p.currentStock < p.minStock;
      return matchesSearch && matchesCategory && matchesStatus && matchesLowStock;
    });
  }, [products, searchKeyword, filters]);

  const lowStockCount = products.filter(p => p.currentStock < p.minStock).length;
  const { paginatedItems, currentPage, totalPages, goToPage, totalItems } = usePagination(filteredProducts, 10);

  const handleStockIn = (product: Product) => {
    setSelectedProduct(product);
    setStockOperation('in');
    stockForm.reset();
    stockModal.open();
  };

  const handleStockOut = (product: Product) => {
    setSelectedProduct(product);
    setStockOperation('out');
    stockForm.reset();
    stockModal.open();
  };

  const columns = [
    {
      key: 'code',
      title: '产品编码',
      render: (item: Product) => (
        <div>
          <p className="font-mono text-sm font-medium text-surface-900">{item.code}</p>
          <p className="text-xs text-surface-400 font-mono">{item.barcode}</p>
        </div>
      ),
    },
    {
      key: 'name',
      title: '产品名称',
      render: (item: Product) => (
        <div>
          <p className="font-medium text-surface-900">{item.name}</p>
          <p className="text-xs text-surface-500">{item.brand} | {item.specification}</p>
        </div>
      ),
    },
    { key: 'category', title: '类别' },
    {
      key: 'stock',
      title: '库存',
      render: (item: Product) => (
        <div className="flex items-center gap-2">
          <span className={cn(
            'font-medium',
            item.currentStock < item.minStock ? 'text-danger-600' : 'text-surface-900'
          )}>
            {item.currentStock}
          </span>
          <span className="text-surface-400">{item.unit}</span>
          {item.currentStock < item.minStock && (
            <AlertTriangle className="h-4 w-4 text-warning-500" />
          )}
        </div>
      ),
    },
    {
      key: 'price',
      title: '售价',
      render: (item: Product) => <span className="font-medium">{formatCurrency(item.sellPrice)}</span>,
    },
    { key: 'location', title: '库位' },
    {
      key: 'status',
      title: '状态',
      render: (item: Product) => <StatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      title: '操作',
      width: '160px',
      render: (item: Product) => (
        <div className="flex items-center gap-1">
          <button onClick={() => handleStockIn(item)} className="p-1.5 hover:bg-success-50 rounded-lg" title="入库">
            <ArrowDownToLine className="h-4 w-4 text-success-600" />
          </button>
          <button onClick={() => handleStockOut(item)} className="p-1.5 hover:bg-primary-50 rounded-lg" title="出库">
            <ArrowUpFromLine className="h-4 w-4 text-primary-600" />
          </button>
          <button onClick={() => { setSelectedProduct(item); detailModal.open(); }} className="p-1.5 hover:bg-surface-100 rounded-lg" title="查看">
            <Eye className="h-4 w-4 text-surface-500" />
          </button>
          <button onClick={() => { setSelectedProduct(item); deleteModal.open(); }} className="p-1.5 hover:bg-danger-50 rounded-lg" title="删除">
            <Trash2 className="h-4 w-4 text-danger-500" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">库存管理</h1>
          <p className="text-surface-500 mt-1">管理产品库存、入库出库操作</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={scannerConnected ? 'success' : 'outline'}
            leftIcon={scannerConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            onClick={scannerModal.open}
          >
            {scannerConnected ? '扫码枪已连接' : '连接扫码枪'}
          </Button>
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>导出</Button>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { form.reset(); setSelectedProduct(null); createModal.open(); }}>
            新建产品
          </Button>
        </div>
      </div>

      {lowStockCount > 0 && (
        <Alert type="warning" title="库存预警" message={`有 ${lowStockCount} 个产品库存低于安全库存，请及时补货`} />
      )}

      {lastScanResult && (
        <Alert type="info" title="扫码结果" message={`条码: ${lastScanResult.barcode}${lastScanResult.product ? ` - ${lastScanResult.product.name}` : ' (未找到产品)'}`} onClose={clearLastScan} />
      )}

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[240px]">
            <SearchInput placeholder="搜索产品名称、编码、条码..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} onClear={() => setSearchKeyword('')} />
          </div>
          <div className="w-40">
            <Select options={categoryOptions} value={filters.category} onChange={(v) => setFilters({ category: v })} placeholder="产品类别" />
          </div>
          <div className="w-40">
            <Select options={statusOptions} value={filters.status} onChange={(v) => setFilters({ status: v })} placeholder="产品状态" />
          </div>
          <Button variant={filters.lowStock ? 'primary' : 'outline'} size="sm" leftIcon={<AlertTriangle className="h-4 w-4" />} onClick={() => setFilters({ lowStock: !filters.lowStock })}>
            库存预警 ({lowStockCount})
          </Button>
        </div>
      </Card>

      <Card padding={false}>
        <Table columns={columns} data={paginatedItems} rowKey="id" emptyText="暂无产品数据" />
        {totalPages > 1 && (
          <div className="p-4 border-t border-surface-100 flex items-center justify-between">
            <span className="text-sm text-surface-500">共 {totalItems} 条记录</span>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal isOpen={createModal.isOpen} onClose={createModal.close} title={selectedProduct ? '编辑产品' : '新建产品'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="产品名称" value={form.values.name} onChange={(e) => form.handleChange('name', e.target.value)} />
          <Input label="产品编码" value={form.values.code} onChange={(e) => form.handleChange('code', e.target.value)} />
          <Input label="条形码" value={form.values.barcode} onChange={(e) => form.handleChange('barcode', e.target.value)} />
          <Select label="产品类别" options={categoryOptions.slice(1)} value={form.values.category} onChange={(v) => form.handleChange('category', v)} />
          <Input label="品牌" value={form.values.brand} onChange={(e) => form.handleChange('brand', e.target.value)} />
          <Input label="规格" value={form.values.specification} onChange={(e) => form.handleChange('specification', e.target.value)} />
          <Input label="单位" value={form.values.unit} onChange={(e) => form.handleChange('unit', e.target.value)} />
          <Input label="库位" value={form.values.location} onChange={(e) => form.handleChange('location', e.target.value)} />
          <Input label="成本价" type="number" value={form.values.costPrice} onChange={(e) => form.handleChange('costPrice', Number(e.target.value))} />
          <Input label="售价" type="number" value={form.values.sellPrice} onChange={(e) => form.handleChange('sellPrice', Number(e.target.value))} />
          <Input label="最小库存" type="number" value={form.values.minStock} onChange={(e) => form.handleChange('minStock', Number(e.target.value))} />
          <Input label="最大库存" type="number" value={form.values.maxStock} onChange={(e) => form.handleChange('maxStock', Number(e.target.value))} />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={createModal.close}>取消</Button>
          <Button onClick={createModal.close}>{selectedProduct ? '保存' : '创建'}</Button>
        </div>
      </Modal>

      {/* Stock Operation Modal */}
      <Modal isOpen={stockModal.isOpen} onClose={stockModal.close} title={stockOperation === 'in' ? '入库操作' : '出库操作'}>
        {selectedProduct && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-50 rounded-xl">
              <p className="font-medium text-surface-900">{selectedProduct.name}</p>
              <p className="text-sm text-surface-500">{selectedProduct.code} | 当前库存: {selectedProduct.currentStock} {selectedProduct.unit}</p>
            </div>
            <Input label="数量" type="number" value={stockForm.values.quantity} onChange={(e) => stockForm.handleChange('quantity', Number(e.target.value))} />
            <Input label="单价" type="number" value={stockForm.values.unitPrice} onChange={(e) => stockForm.handleChange('unitPrice', Number(e.target.value))} />
            <Input label="备注" value={stockForm.values.remark} onChange={(e) => stockForm.handleChange('remark', e.target.value)} />
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={stockModal.close}>取消</Button>
              <Button variant={stockOperation === 'in' ? 'success' : 'primary'} onClick={stockModal.close}>
                确认{stockOperation === 'in' ? '入库' : '出库'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Scanner Modal */}
      <Modal isOpen={scannerModal.isOpen} onClose={scannerModal.close} title="扫码枪设置">
        <div className="space-y-4">
          <div className={cn('p-4 rounded-xl flex items-center gap-3', scannerConnected ? 'bg-success-50' : 'bg-surface-100')}>
            {scannerConnected ? <Wifi className="h-5 w-5 text-success-600" /> : <WifiOff className="h-5 w-5 text-surface-400" />}
            <div>
              <p className="font-medium">{scannerConnected ? '已连接' : '未连接'}</p>
              <p className="text-sm text-surface-500">扫码枪状态</p>
            </div>
          </div>
          <Select label="串口选择" options={[{ value: 'COM1', label: 'COM1' }, { value: 'COM2', label: 'COM2' }]} value="COM1" onChange={() => { }} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={scannerModal.close}>关闭</Button>
            {scannerConnected ? (
              <Button variant="danger" onClick={() => { disconnect(); scannerModal.close(); }}>断开连接</Button>
            ) : (
              <Button onClick={() => { connect('COM1'); scannerModal.close(); }}>连接</Button>
            )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={detailModal.isOpen} onClose={detailModal.close} title="产品详情" size="lg">
        {selectedProduct && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-surface-500">产品名称:</span> {selectedProduct.name}</div>
              <div><span className="text-surface-500">产品编码:</span> {selectedProduct.code}</div>
              <div><span className="text-surface-500">条形码:</span> {selectedProduct.barcode}</div>
              <div><span className="text-surface-500">品牌:</span> {selectedProduct.brand}</div>
              <div><span className="text-surface-500">类别:</span> {selectedProduct.category}</div>
              <div><span className="text-surface-500">规格:</span> {selectedProduct.specification}</div>
              <div><span className="text-surface-500">当前库存:</span> {selectedProduct.currentStock} {selectedProduct.unit}</div>
              <div><span className="text-surface-500">库位:</span> {selectedProduct.location}</div>
              <div><span className="text-surface-500">成本价:</span> {formatCurrency(selectedProduct.costPrice)}</div>
              <div><span className="text-surface-500">售价:</span> {formatCurrency(selectedProduct.sellPrice)}</div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={deleteModal.close} title="删除产品" message={`确定要删除产品 "${selectedProduct?.name}" 吗？`} variant="danger" confirmText="删除" />
    </div>
  );
}
