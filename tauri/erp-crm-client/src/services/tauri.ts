import { invoke } from '@tauri-apps/api/core';
import type {
  Customer,
  Product,
  Order,
  User,
  ApiResponse,
  PaginatedResponse,
  SearchParams,
  SyncStatus,
  DashboardStats,
  ScannerConfig,
  ScanResult,
  StockRecord,
  StockCheckItem,
} from '@/types';

// ==================== Tauri 命令调用封装 ====================

/**
 * 调用 Tauri 后端命令
 */
async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (error) {
    console.error(`Tauri command error [${cmd}]:`, error);
    throw error;
  }
}

// ==================== 认证服务 ====================

export const authService = {
  /**
   * 用户登录
   */
  async login(username: string, password: string): Promise<ApiResponse<User>> {
    return tauriInvoke('auth_login', { username, password });
  },

  /**
   * 用户登出
   */
  async logout(): Promise<ApiResponse<void>> {
    return tauriInvoke('auth_logout');
  },

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return tauriInvoke('auth_get_current_user');
  },

  /**
   * 修改密码
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return tauriInvoke('auth_change_password', { oldPassword, newPassword });
  },
};

// ==================== 客户管理服务 ====================

export const customerService = {
  /**
   * 获取客户列表
   */
  async getCustomers(params: SearchParams): Promise<ApiResponse<PaginatedResponse<Customer>>> {
    return tauriInvoke('customer_list', { params });
  },

  /**
   * 获取单个客户
   */
  async getCustomer(id: string): Promise<ApiResponse<Customer>> {
    return tauriInvoke('customer_get', { id });
  },

  /**
   * 创建客户
   */
  async createCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Customer>> {
    return tauriInvoke('customer_create', { data });
  },

  /**
   * 更新客户
   */
  async updateCustomer(id: string, data: Partial<Customer>): Promise<ApiResponse<Customer>> {
    return tauriInvoke('customer_update', { id, data });
  },

  /**
   * 删除客户
   */
  async deleteCustomer(id: string): Promise<ApiResponse<void>> {
    return tauriInvoke('customer_delete', { id });
  },

  /**
   * 搜索客户
   */
  async searchCustomers(keyword: string): Promise<ApiResponse<Customer[]>> {
    return tauriInvoke('customer_search', { keyword });
  },

  /**
   * 导出客户数据
   */
  async exportCustomers(format: 'xlsx' | 'csv'): Promise<ApiResponse<string>> {
    return tauriInvoke('customer_export', { format });
  },
};

// ==================== 库存管理服务 ====================

export const inventoryService = {
  /**
   * 获取产品列表
   */
  async getProducts(params: SearchParams): Promise<ApiResponse<PaginatedResponse<Product>>> {
    return tauriInvoke('product_list', { params });
  },

  /**
   * 获取单个产品
   */
  async getProduct(id: string): Promise<ApiResponse<Product>> {
    return tauriInvoke('product_get', { id });
  },

  /**
   * 根据条码获取产品
   */
  async getProductByBarcode(barcode: string): Promise<ApiResponse<Product>> {
    return tauriInvoke('product_get_by_barcode', { barcode });
  },

  /**
   * 创建产品
   */
  async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Product>> {
    return tauriInvoke('product_create', { data });
  },

  /**
   * 更新产品
   */
  async updateProduct(id: string, data: Partial<Product>): Promise<ApiResponse<Product>> {
    return tauriInvoke('product_update', { id, data });
  },

  /**
   * 删除产品
   */
  async deleteProduct(id: string): Promise<ApiResponse<void>> {
    return tauriInvoke('product_delete', { id });
  },

  /**
   * 入库操作
   */
  async stockIn(productId: string, quantity: number, unitPrice: number, remark?: string): Promise<ApiResponse<StockRecord>> {
    return tauriInvoke('stock_in', { productId, quantity, unitPrice, remark });
  },

  /**
   * 出库操作
   */
  async stockOut(productId: string, quantity: number, unitPrice: number, remark?: string): Promise<ApiResponse<StockRecord>> {
    return tauriInvoke('stock_out', { productId, quantity, unitPrice, remark });
  },

  /**
   * 库存调整
   */
  async stockAdjust(productId: string, actualQuantity: number, remark?: string): Promise<ApiResponse<StockRecord>> {
    return tauriInvoke('stock_adjust', { productId, actualQuantity, remark });
  },

  /**
   * 获取库存记录
   */
  async getStockRecords(productId: string, params: SearchParams): Promise<ApiResponse<PaginatedResponse<StockRecord>>> {
    return tauriInvoke('stock_records', { productId, params });
  },

  /**
   * 创建盘点单
   */
  async createStockCheck(warehouseId: string): Promise<ApiResponse<{ id: string; code: string }>> {
    return tauriInvoke('stock_check_create', { warehouseId });
  },

  /**
   * 提交盘点结果
   */
  async submitStockCheck(id: string, items: StockCheckItem[]): Promise<ApiResponse<void>> {
    return tauriInvoke('stock_check_submit', { id, items });
  },

  /**
   * 获取库存预警列表
   */
  async getLowStockProducts(): Promise<ApiResponse<Product[]>> {
    return tauriInvoke('product_low_stock');
  },
};

// ==================== 订单管理服务 ====================

export const orderService = {
  /**
   * 获取订单列表
   */
  async getOrders(params: SearchParams): Promise<ApiResponse<PaginatedResponse<Order>>> {
    return tauriInvoke('order_list', { params });
  },

  /**
   * 获取单个订单
   */
  async getOrder(id: string): Promise<ApiResponse<Order>> {
    return tauriInvoke('order_get', { id });
  },

  /**
   * 创建订单
   */
  async createOrder(data: Omit<Order, 'id' | 'code' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Order>> {
    return tauriInvoke('order_create', { data });
  },

  /**
   * 更新订单
   */
  async updateOrder(id: string, data: Partial<Order>): Promise<ApiResponse<Order>> {
    return tauriInvoke('order_update', { id, data });
  },

  /**
   * 删除订单
   */
  async deleteOrder(id: string): Promise<ApiResponse<void>> {
    return tauriInvoke('order_delete', { id });
  },

  /**
   * 确认订单
   */
  async confirmOrder(id: string): Promise<ApiResponse<Order>> {
    return tauriInvoke('order_confirm', { id });
  },

  /**
   * 取消订单
   */
  async cancelOrder(id: string, reason: string): Promise<ApiResponse<Order>> {
    return tauriInvoke('order_cancel', { id, reason });
  },

  /**
   * 完成订单
   */
  async completeOrder(id: string): Promise<ApiResponse<Order>> {
    return tauriInvoke('order_complete', { id });
  },
};

// ==================== 数据同步服务 ====================

export const syncService = {
  /**
   * 获取同步状态
   */
  async getSyncStatus(): Promise<ApiResponse<SyncStatus>> {
    return tauriInvoke('sync_status');
  },

  /**
   * 开始同步
   */
  async startSync(): Promise<ApiResponse<void>> {
    return tauriInvoke('sync_start');
  },

  /**
   * 停止同步
   */
  async stopSync(): Promise<ApiResponse<void>> {
    return tauriInvoke('sync_stop');
  },

  /**
   * 强制全量同步
   */
  async forceFullSync(): Promise<ApiResponse<void>> {
    return tauriInvoke('sync_force_full');
  },

  /**
   * 重试失败的同步
   */
  async retrySyncErrors(): Promise<ApiResponse<void>> {
    return tauriInvoke('sync_retry_errors');
  },

  /**
   * 清除同步错误
   */
  async clearSyncErrors(): Promise<ApiResponse<void>> {
    return tauriInvoke('sync_clear_errors');
  },
};

// ==================== 扫码枪服务 ====================

export const scannerService = {
  /**
   * 获取可用串口列表
   */
  async getAvailablePorts(): Promise<ApiResponse<string[]>> {
    return tauriInvoke('scanner_list_ports');
  },

  /**
   * 连接扫码枪
   */
  async connect(config: ScannerConfig): Promise<ApiResponse<void>> {
    return tauriInvoke('scanner_connect', { config });
  },

  /**
   * 断开扫码枪
   */
  async disconnect(): Promise<ApiResponse<void>> {
    return tauriInvoke('scanner_disconnect');
  },

  /**
   * 获取扫码枪状态
   */
  async getStatus(): Promise<ApiResponse<{ connected: boolean; port?: string }>> {
    return tauriInvoke('scanner_status');
  },

  /**
   * 处理扫码结果
   */
  async handleScan(barcode: string): Promise<ApiResponse<ScanResult>> {
    return tauriInvoke('scanner_handle_scan', { barcode });
  },
};

// ==================== 加密存储服务 ====================

export const storageService = {
  /**
   * 存储加密数据
   */
  async setSecure(key: string, value: string): Promise<ApiResponse<void>> {
    return tauriInvoke('storage_set_secure', { key, value });
  },

  /**
   * 获取加密数据
   */
  async getSecure(key: string): Promise<ApiResponse<string | null>> {
    return tauriInvoke('storage_get_secure', { key });
  },

  /**
   * 删除加密数据
   */
  async deleteSecure(key: string): Promise<ApiResponse<void>> {
    return tauriInvoke('storage_delete_secure', { key });
  },

  /**
   * 清除所有加密数据
   */
  async clearSecure(): Promise<ApiResponse<void>> {
    return tauriInvoke('storage_clear_secure');
  },

  /**
   * 导出本地数据
   */
  async exportData(password: string): Promise<ApiResponse<string>> {
    return tauriInvoke('storage_export', { password });
  },

  /**
   * 导入本地数据
   */
  async importData(filePath: string, password: string): Promise<ApiResponse<void>> {
    return tauriInvoke('storage_import', { filePath, password });
  },
};

// ==================== 报表服务 ====================

export const reportService = {
  /**
   * 获取 Dashboard 统计数据
   */
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return tauriInvoke('report_dashboard_stats');
  },

  /**
   * 获取销售报表
   */
  async getSalesReport(startDate: string, endDate: string): Promise<ApiResponse<unknown>> {
    return tauriInvoke('report_sales', { startDate, endDate });
  },

  /**
   * 获取库存报表
   */
  async getInventoryReport(): Promise<ApiResponse<unknown>> {
    return tauriInvoke('report_inventory');
  },

  /**
   * 获取客户分析报表
   */
  async getCustomerReport(): Promise<ApiResponse<unknown>> {
    return tauriInvoke('report_customer');
  },

  /**
   * 导出报表
   */
  async exportReport(reportType: string, format: 'xlsx' | 'pdf'): Promise<ApiResponse<string>> {
    return tauriInvoke('report_export', { reportType, format });
  },
};

// ==================== 系统服务 ====================

export const systemService = {
  /**
   * 获取系统信息
   */
  async getSystemInfo(): Promise<ApiResponse<{
    version: string;
    os: string;
    arch: string;
    dataDir: string;
  }>> {
    return tauriInvoke('system_info');
  },

  /**
   * 检查更新
   */
  async checkUpdate(): Promise<ApiResponse<{
    hasUpdate: boolean;
    version?: string;
    releaseNotes?: string;
  }>> {
    return tauriInvoke('system_check_update');
  },

  /**
   * 清除缓存
   */
  async clearCache(): Promise<ApiResponse<void>> {
    return tauriInvoke('system_clear_cache');
  },

  /**
   * 获取日志
   */
  async getLogs(level: 'error' | 'warn' | 'info' | 'debug', limit: number): Promise<ApiResponse<string[]>> {
    return tauriInvoke('system_get_logs', { level, limit });
  },
};
