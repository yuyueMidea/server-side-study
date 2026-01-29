import { useState, useEffect } from 'react';
import { Card, StatCard, Loading } from '@/components/common';
import { formatCurrency, formatNumber } from '@/utils';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Users, Package, ShoppingCart, TrendingUp, AlertTriangle } from 'lucide-react';

const mockStats = {
  totalCustomers: 1234, activeCustomers: 892, totalProducts: 567,
  lowStockProducts: 23, todayOrders: 45, todayRevenue: 125680,
  monthlyRevenue: 3456780, monthlyGrowth: 12.5,
};

const revenueData = [
  { name: '1月', revenue: 240000 }, { name: '2月', revenue: 280000 },
  { name: '3月', revenue: 320000 }, { name: '4月', revenue: 290000 },
  { name: '5月', revenue: 380000 }, { name: '6月', revenue: 420000 },
  { name: '7月', revenue: 390000 },
];

const categoryData = [
  { name: '电子产品', value: 35 }, { name: '办公用品', value: 25 },
  { name: '食品饮料', value: 20 }, { name: '日用百货', value: 15 }, { name: '其他', value: 5 },
];

const topProducts = [
  { name: '笔记本电脑', sales: 156 }, { name: '打印机', sales: 234 },
  { name: '办公椅', sales: 189 }, { name: '显示器', sales: 145 }, { name: '键盘鼠标', sales: 312 },
];

const recentOrders = [
  { id: 'SO202401001', customer: '科技有限公司', amount: 25680, status: 'completed' },
  { id: 'SO202401002', customer: '贸易股份', amount: 18900, status: 'shipped' },
  { id: 'SO202401003', customer: '信息技术', amount: 42350, status: 'pending' },
  { id: 'SO202401004', customer: '网络科技', amount: 15680, status: 'completed' },
  { id: 'SO202401005', customer: '软件开发', amount: 33200, status: 'confirmed' },
];

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

export function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) return <div className="flex items-center justify-center h-96"><Loading size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">仪表盘</h1>
        <p className="text-surface-500 mt-1">欢迎回来，这是您的业务概览</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="客户总数" value={formatNumber(mockStats.totalCustomers)} change={{ value: 8.2, type: 'increase' }} icon={<Users className="h-5 w-5" />} />
        <StatCard label="产品数量" value={formatNumber(mockStats.totalProducts)} change={{ value: 3.1, type: 'increase' }} icon={<Package className="h-5 w-5" />} />
        <StatCard label="今日订单" value={mockStats.todayOrders} change={{ value: 12.5, type: 'increase' }} icon={<ShoppingCart className="h-5 w-5" />} />
        <StatCard label="本月营收" value={formatCurrency(mockStats.monthlyRevenue)} change={{ value: mockStats.monthlyGrowth, type: 'increase' }} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="font-semibold text-surface-900 mb-6">营收趋势</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-surface-900 mb-6">品类分布</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {categoryData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-surface-900 mb-6">热销产品</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} width={80} />
                <Tooltip />
                <Bar dataKey="sales" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-surface-900">最近订单</h3>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">查看全部</button>
          </div>
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-3 border-b border-surface-100 last:border-0">
                <div>
                  <p className="font-medium text-surface-900">{order.id}</p>
                  <p className="text-sm text-surface-500">{order.customer}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-surface-900">{formatCurrency(order.amount)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${order.status === 'completed' ? 'bg-success-50 text-success-600' : order.status === 'shipped' ? 'bg-primary-50 text-primary-600' : order.status === 'pending' ? 'bg-warning-50 text-warning-600' : 'bg-surface-100 text-surface-600'}`}>
                    {order.status === 'completed' ? '已完成' : order.status === 'shipped' ? '已发货' : order.status === 'pending' ? '待确认' : '已确认'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {mockStats.lowStockProducts > 0 && (
        <Card className="bg-warning-50 border-warning-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-warning-100 rounded-xl"><AlertTriangle className="h-6 w-6 text-warning-600" /></div>
            <div className="flex-1">
              <h4 className="font-medium text-warning-800">库存预警</h4>
              <p className="text-sm text-warning-700">有 {mockStats.lowStockProducts} 个产品库存不足</p>
            </div>
            <button className="px-4 py-2 bg-warning-600 text-white rounded-lg text-sm font-medium hover:bg-warning-700">查看详情</button>
          </div>
        </Card>
      )}
    </div>
  );
}
