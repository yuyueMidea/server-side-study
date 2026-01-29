import { useState, useMemo } from 'react';
import { Button, SearchInput, Select, Card, Table, Modal, StatusBadge, Pagination, ConfirmDialog, Tabs } from '@/components/common';
import { useOrderStore } from '@/store';
import { useModal, usePagination } from '@/hooks';
import { formatDate, formatCurrency, getStatusText } from '@/utils';
import { Plus, Download, Eye, Trash2, CheckCircle, XCircle, Truck } from 'lucide-react';
import type { Order, OrderStatus, OrderType } from '@/types';

const mockOrders: Order[] = Array.from({ length: 30 }, (_, i) => ({
  id: `order-${i + 1}`,
  code: `SO2024${String(i + 1).padStart(5, '0')}`,
  type: (['sale', 'purchase', 'return'] as OrderType[])[i % 3],
  customerId: `cust-${(i % 10) + 1}`,
  customerName: ['科技有限公司', '贸易股份', '信息技术', '网络科技', '软件开发'][i % 5],
  status: (['draft', 'pending', 'confirmed', 'shipped', 'completed', 'cancelled'] as OrderStatus[])[i % 6],
  items: [{ id: '1', productId: 'p1', productName: '笔记本电脑', productCode: 'P001', unit: '台', quantity: 2, unitPrice: 5000, discount: 0, amount: 10000, remark: '' }],
  totalQuantity: 5 + i,
  totalAmount: 10000 + i * 1000,
  discountAmount: 500,
  payableAmount: 9500 + i * 1000,
  paidAmount: i % 2 === 0 ? 9500 + i * 1000 : 0,
  deliveryAddress: `北京市朝阳区某某路 ${i + 1} 号`,
  deliveryDate: new Date(Date.now() + i * 86400000).toISOString(),
  remark: '订单备注',
  operatorId: 'user-1',
  operatorName: '管理员',
  createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  updatedAt: new Date().toISOString(),
}));

const typeOptions = [
  { value: '', label: '全部类型' },
  { value: 'sale', label: '销售订单' },
  { value: 'purchase', label: '采购订单' },
  { value: 'return', label: '退货订单' },
];

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '待确认' },
  { value: 'confirmed', label: '已确认' },
  { value: 'shipped', label: '已发货' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const tabs = [
  { id: 'all', label: '全部订单' },
  { id: 'pending', label: '待处理' },
  { id: 'processing', label: '进行中' },
  { id: 'completed', label: '已完成' },
];

export function OrdersPage() {
  const { searchKeyword, setSearchKeyword, filters, setFilters } = useOrderStore();
  const [orders] = useState<Order[]>(mockOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const detailModal = useModal();
  const deleteModal = useModal();

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch = !searchKeyword || o.code.includes(searchKeyword) || o.customerName.includes(searchKeyword);
      const matchesType = !filters.type || o.type === filters.type;
      const matchesStatus = !filters.status || o.status === filters.status;
      let matchesTab = true;
      if (activeTab === 'pending') matchesTab = ['draft', 'pending'].includes(o.status);
      if (activeTab === 'processing') matchesTab = ['confirmed', 'shipped'].includes(o.status);
      if (activeTab === 'completed') matchesTab = ['completed', 'cancelled'].includes(o.status);
      return matchesSearch && matchesType && matchesStatus && matchesTab;
    });
  }, [orders, searchKeyword, filters, activeTab]);

  const { paginatedItems, currentPage, totalPages, goToPage, totalItems } = usePagination(filteredOrders, 10);

  const getStatusActions = (order: Order) => {
    switch (order.status) {
      case 'draft':
      case 'pending':
        return (
          <>
            <button className="p-1.5 hover:bg-success-50 rounded-lg" title="确认"><CheckCircle className="h-4 w-4 text-success-600" /></button>
            <button className="p-1.5 hover:bg-danger-50 rounded-lg" title="取消"><XCircle className="h-4 w-4 text-danger-500" /></button>
          </>
        );
      case 'confirmed':
        return <button className="p-1.5 hover:bg-primary-50 rounded-lg" title="发货"><Truck className="h-4 w-4 text-primary-600" /></button>;
      default:
        return null;
    }
  };

  const columns = [
    {
      key: 'code',
      title: '订单编号',
      render: (item: Order) => (
        <div>
          <p className="font-mono font-medium text-surface-900">{item.code}</p>
          <p className="text-xs text-surface-500">{formatDate(item.createdAt, 'datetime')}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      title: '客户',
      render: (item: Order) => <span className="font-medium">{item.customerName}</span>,
    },
    {
      key: 'type',
      title: '类型',
      render: (item: Order) => (
        <span className={`text-xs px-2 py-1 rounded-full ${item.type === 'sale' ? 'bg-primary-50 text-primary-600' :
            item.type === 'purchase' ? 'bg-success-50 text-success-600' : 'bg-warning-50 text-warning-600'
          }`}>
          {getStatusText(item.type)}
        </span>
      ),
    },
    {
      key: 'amount',
      title: '金额',
      render: (item: Order) => (
        <div>
          <p className="font-medium text-surface-900">{formatCurrency(item.payableAmount)}</p>
          <p className="text-xs text-surface-500">{item.totalQuantity} 件商品</p>
        </div>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (item: Order) => <StatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      title: '操作',
      width: '160px',
      render: (item: Order) => (
        <div className="flex items-center gap-1">
          {getStatusActions(item)}
          <button onClick={() => { setSelectedOrder(item); detailModal.open(); }} className="p-1.5 hover:bg-surface-100 rounded-lg"><Eye className="h-4 w-4 text-surface-500" /></button>
          <button onClick={() => { setSelectedOrder(item); deleteModal.open(); }} className="p-1.5 hover:bg-danger-50 rounded-lg"><Trash2 className="h-4 w-4 text-danger-500" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">订单管理</h1>
          <p className="text-surface-500 mt-1">管理销售订单、采购订单和退货订单</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>导出</Button>
          <Button leftIcon={<Plus className="h-4 w-4" />}>新建订单</Button>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[240px]">
            <SearchInput placeholder="搜索订单号、客户名称..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} onClear={() => setSearchKeyword('')} />
          </div>
          <div className="w-40">
            <Select options={typeOptions} value={filters.type} onChange={(v) => setFilters({ type: v })} placeholder="订单类型" />
          </div>
          <div className="w-40">
            <Select options={statusOptions} value={filters.status} onChange={(v) => setFilters({ status: v })} placeholder="订单状态" />
          </div>
        </div>
      </Card>

      <Card padding={false}>
        <Table columns={columns} data={paginatedItems} rowKey="id" emptyText="暂无订单数据" />
        {totalPages > 1 && (
          <div className="p-4 border-t border-surface-100 flex items-center justify-between">
            <span className="text-sm text-surface-500">共 {totalItems} 条记录</span>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
          </div>
        )}
      </Card>

      <Modal isOpen={detailModal.isOpen} onClose={detailModal.close} title="订单详情" size="xl">
        {selectedOrder && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-surface-50 rounded-xl">
              <div>
                <p className="font-mono text-lg font-semibold">{selectedOrder.code}</p>
                <p className="text-sm text-surface-500">{formatDate(selectedOrder.createdAt, 'datetime')}</p>
              </div>
              <StatusBadge status={selectedOrder.status} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-surface-500">客户:</span> {selectedOrder.customerName}</div>
              <div><span className="text-surface-500">类型:</span> {getStatusText(selectedOrder.type)}</div>
              <div><span className="text-surface-500">商品数量:</span> {selectedOrder.totalQuantity} 件</div>
              <div><span className="text-surface-500">订单金额:</span> {formatCurrency(selectedOrder.totalAmount)}</div>
              <div><span className="text-surface-500">优惠金额:</span> {formatCurrency(selectedOrder.discountAmount)}</div>
              <div><span className="text-surface-500">应付金额:</span> <span className="font-semibold text-primary-600">{formatCurrency(selectedOrder.payableAmount)}</span></div>
              <div className="col-span-2"><span className="text-surface-500">收货地址:</span> {selectedOrder.deliveryAddress}</div>
              <div className="col-span-2"><span className="text-surface-500">备注:</span> {selectedOrder.remark || '无'}</div>
            </div>
            <div>
              <h4 className="font-medium mb-3">商品明细</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>商品名称</th>
                    <th>单价</th>
                    <th>数量</th>
                    <th>金额</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.productName}</td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td>{item.quantity} {item.unit}</td>
                      <td>{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={deleteModal.close} title="删除订单" message={`确定要删除订单 "${selectedOrder?.code}" 吗？`} variant="danger" confirmText="删除" />
    </div>
  );
}
