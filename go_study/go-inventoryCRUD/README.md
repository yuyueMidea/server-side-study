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
