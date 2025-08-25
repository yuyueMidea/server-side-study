**1. 系统概览**

后端：Go（net/http）+ SQLite（modernc.org/sqlite 驱动）。
- 提供产品 CRUD、库存流水（入库/出库/调整）接口。
- 自动建表、启用 WAL、外键约束、CORS（默认 *）。
- 库存计算：IN 加、OUT 减、ADJUST 正负都可；默认不允许负库存。

前端：Vite + React（JS）+ TailwindCSS。
- 三大页面：📊 总览、📦 产品、🔁 流水。
- 支持搜索、分页、库存预警、弹窗表单、新建流水（带产品搜索选择器）。

**2. 环境准备与启动**

后端安装依赖并运行：
```
go mod init inventory
go get modernc.org/sqlite
go run .
```

前端安装依赖并运行：
```
npm install
npm run dev
# or pnpm dev / yarn dev
```

**3. 前端界面与操作**

选项卡（Tabs）

📊 总览（Dashboard）
- 显示 SKU 总数、库存总值（单价×数量的粗算）、低于补货线数量。
- 下方列出“补货告警”（stock_on_hand <= reorder_level 的产品）。

📦 产品（Products）
- 列表：包含 ID、SKU、名称、品牌、分类、单价、补货线、当前库存。
- 搜索：按 SKU/名称（输入框右上）。
- 分页：每页数量 & 上/下一页。
- 新增/编辑/删除：
   - 新增/编辑在弹窗内填写。
   - 删除会二次确认。
- 流水入口：点击行内“流水”可跳到流水页并自动带上该产品 ID。

🔁 流水（Transactions）
- 筛选条件：产品 ID、类型（IN/OUT/ADJUST）、时间区间、分页。
- 新建流水：
   - 弹窗中提供“产品搜索选择器”，搜索 SKU/名称→点击候选项→自动填入产品 ID。
   - 类型 IN/OUT 的数量必须 > 0；ADJUST 可正可负但不可 0。
   - 提交前前端会预校验产品是否存在，减少后端 400 错误。


## 4. 典型业务流程

4.1 新建产品
- 打开 产品 页，点击「新增产品」。
- 必填：SKU、名称（unit_price 可为 0；reorder_level 可为 0）。
- 可选：品牌、分类 ID、供应商 ID。
- 点击「保存」。
- 成功后产品会出现在列表中；库存初始为 0。
- 注意：SKU 唯一。若重复，后端会返回 400（SQLite 约束）。

4.2 入库（IN）
- 打开 流水 页，点击「新建流水」。
- 在“产品”搜索框输入 SKU/名称，点击候选项填入 产品 ID。
- 类型选 IN，填写数量（>0）、单成本（可空）、单号等。
- 提交后库存将增加。

4.3 出库（OUT）
- 方式同上，但类型选 OUT，数量（>0）。
- 后端会校验库存是否足够；不足则返回 400 insufficient stock。

4.4 库存调整（ADJUST）
- 类型选 ADJUST：数量可正可负，但不可 0。
- 负向调整同样受“不可为负库存”规则限制。

4.5 查看库存
- 在 产品 列表的“库存”列查看。
- 或点击产品行「流水」跳到 流水 页筛选该产品的所有交易。
- 后端提供 GET /api/products/{id}/stock 返回：stock_on_hand、stock_value 等。

4.6 补货告警
- 在 总览 页底部的“补货告警”区查看。
- 依据：stock_on_hand <= reorder_level。

**5. 后端 API 速查**

- 通用：请求/响应均为 JSON。出现 400 的常见原因：字段类型不符（如把数字传成字符串）、SKU 重复、产品不存在、库存不足、数量非法等。
- 产品列表:
```GET /api/products?q=<kw>&category_id=<id>&limit=&offset=
→ { items: [...], limit, offset }
```

查询 / 更新 / 删除：
```
GET    /api/products/{id}
PUT    /api/products/{id}      // 局部更新，留空的字段不影响未填字段
DELETE /api/products/{id}
```

**6. 数据与规则说明**
- 字段类型（重点）
   - category_id / supplier_id 必须传 number 或 null（不要传字符串 "10086"）。
   - unit_price / reorder_level 应为 number。
   - 前端已在保存前做了正确转换与空值处理。
- SKU 唯一，重复会 400。
- 负库存：默认禁止。
- 时间：所有 created_at 为 SQLite datetime('now')，UTC 字符串。

**7. 常见问题排查（FAQ）**

新增产品 400：invalid json
- 多半是把 number 字段传了字符串。确认请求 payload 里：
- category_id/supplier_id/unit_price/reorder_level 为 数字或 null，而不是 "10086"、"12" 这类带引号的。

新增流水 400：product not found
- 该 sqlproduct_id 不存在。
- 解决：在“产品”页确认 ID 列，或在“新建流水”弹窗用搜索选择器来选择产品（会自动填入 ID）。

出库报 insufficient stock
- 当前库存不足。
- 解决：先 IN 入库，或使用 ADJUST 正向调整（取决于业务流程是否允许）。

CORS 报错
- 若前端与后端不在同域且被阻止，请将后端环境变量 CORS_ORIGIN 设置为你的前端地址（如 http://localhost:5173）并重启后端。

SKU 重复
- 更换 SKU 或先删除旧记录。

**9. 扩展与建议**
- 更丰富维表：warehouses、suppliers 的 CRUD 与外键校验。
- 导入导出：CSV/Excel 批量导入产品、导出流水。
- 权限与审计：基于 JWT/Session 的鉴权、操作日志、撤销/红冲。
- 性能：后端增加聚合接口（批量返回所有产品的库存），减少前端 N 次请求。
- 更强校验：前端表单增加 NaN 检测与提示，后端返回结构化错误码。



