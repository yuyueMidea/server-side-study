**「Go + SQLite 电商 API」**

包含以下：
- 完整的数据表 & 迁移（customers/products/orders/order_items/payments，含外键/索引）
- 事务化创建订单（含多个明细 & 可选首付）
- 支付追加、自动“已付款”状态判断（付款总额覆盖订单总额则置 paid）
- 订单列表/详情（汇总 items_total、paid_total、outstanding）
- 客户 & 商品 CRUD、客户汇总
- 业务指标示例：/analytics/daily-gmv
- CORS 已开启（前端可跨域直接调用）
- 可选 /_seed 种子数据（通过环境变量开启）
