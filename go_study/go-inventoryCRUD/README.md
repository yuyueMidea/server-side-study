**1. 系统概览**

后端：Go（net/http）+ SQLite（modernc.org/sqlite 驱动）。
- 提供产品 CRUD、库存流水（入库/出库/调整）接口。
- 自动建表、启用 WAL、外键约束、CORS（默认 *）。
- 库存计算：IN 加、OUT 减、ADJUST 正负都可；默认不允许负库存。

前端：Vite + React（JS）+ TailwindCSS。
- 三大页面：📊 总览、📦 产品、🔁 流水。
- 支持搜索、分页、库存预警、弹窗表单、新建流水（带产品搜索选择器）。
