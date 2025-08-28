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

运行方式：
```
go mod init go-sqlite-ecommerce-api
go get github.com/go-chi/chi/v5 github.com/go-chi/cors modernc.org/sqlite
go run .
//前端直接打开 index.html
纯 HTML + CSS + 原生 JavaScript 的单页应用，已按模块拆分：客户、商品、订单（含明细/付款）、分析（每日 GMV 折线图）。默认与 Go+SQLite 后端对接，支持跨域。
```

主要接口示例
- 健康检查：GET /health
- 客户：GET/POST /customers, GET/PUT/DELETE /customers/{id}, GET /customers/{id}/summary
- 商品：GET/POST /products, GET/PUT/DELETE /products/{id}
- 订单：GET /orders（支持 status/customer_id/from/to 过滤，分页），POST /orders，GET /orders/{id}，PUT /orders/{id}/status，POST /orders/{id}/payments
- 指标：GET /analytics/daily-gmv?from=YYYY-MM-DD&to=YYYY-MM-DD
