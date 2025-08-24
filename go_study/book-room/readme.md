**一套可直接跑的「Go + SQLite」预订系统 API**

包含以下：
- 完整的房间 rooms、预订 bookings REST 接口（增删改查、筛选、分页）。
- 关键的“同一房间时间段不重叠（[start, end) 区间语义）”校验：在**事务（BEGIN IMMEDIATE）**内做重叠查询并写入，避免并发竞态。
- SQLite 本地存储（纯 Go 驱动 modernc.org/sqlite，无 CGO），外加索引与 CHECK 约束。
- CORS 跨域支持（默认 *），前端可直接 fetch 调用。
- 错误码语义化（400/404/409/500）与统一 JSON 返回。
