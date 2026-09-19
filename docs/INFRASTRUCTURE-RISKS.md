# INFRASTRUCTURE-RISKS — 微信 AI 使用技巧整理站

> Stage 04a 交付物。基础设施风险矩阵与缓解策略。

## 风险矩阵

| ID | 风险 | 概率 | 影响 | 缓解策略 | 监控 |
|---|---|---|---|---|---|
| IR-1 | FREE 套餐 3s 超时不足 | 中 | 中 | MCP 查询走 FTS 优化；导入走异步批量 | CloudBase 函数日志 |
| IR-2 | FREE 套餐 256MB 内存限制 chromium 启动 | 已确认 | 中 | Cheat Sheet 推迟到 v1.1 + CloudRun | n/a |
| IR-3 | 无固定出口 IP，飞书 API 配置不便 | 中 | 中 | 飞书 API 默认允许任意 IP；如需白名单申请 STANDARD | 飞书开发者后台 |
| IR-4 | 数据库自动暂停导致首访延迟 | 中 | 低 | ISR 缓存 5 分钟；接受 1s 首访延迟 | CloudBase 控制台 |
| IR-5 | 月资源点超 3000 | 低 | 低 | 按量付费；预估用量 750-900 点 | 月用量告警 80% |
| IR-6 | Postgres 数据丢失 | 低 | 高 | 周备 cron + 本地也存一份 | 备份文件时间戳 |
| IR-7 | 截图存储被 CloudBase 回收 | 低 | 高 | 数据库保留 storage_key 永久；定期校验存在 | 月度校验 job |
| IR-8 | 飞书 API 限流 | 中 | 中 | 增量同步 + 退避重试 | 导入函数日志 |
| IR-9 | CloudBase 函数冷启动慢 | 中 | 低 | HTTP 触发预热；ISR 缓存 | CloudBase 函数监控 |
| IR-10 | MCP 接口被滥用 | 中 | 中 | 速率限制（200 RPM）+ Bearer Token 鉴权 | 函数日志 |
| IR-11 | 公网截图被搜索引擎索引（敏感信息） | 中 | 高 | 截图打码 SOP + 站内 noindex 某些页面 | 手动抽查 |
| IR-12 | 域名失效（仅 1 个自定义域名额度） | 低 | 中 | 先用 CloudBase 默认域名测试；稳定后申请正式域名 | n/a |
| IR-13 | CloudBase 单区域故障 | 极低 | 高 | 数据有备份；恢复可在另一区域重建 | n/a |
| IR-14 | Next.js 15 App Router 在 CloudBase 静态托管的兼容性 | 低 | 中 | 部署前在预览环境验证 | CloudBase 部署日志 |
| IR-15 | MCP Streamable HTTP 客户端兼容性 | 低 | 中 | 提供 SSE 备用 + JSON-RPC 双重支持 | MCP Inspector 联调 |

## 缓解策略详解

### IR-1: 函数超时 3s 不足
**现状**：FREE / 个人版硬限制。
**已验证 ≤ 3s 的函数**：
- `mcp-server`：搜索 < 300ms
- `search`：FTS 查询 < 200ms
- `admin-tags`：单事务 < 100ms
- `backup`：pg_dump 后上传分块；可能超 3s

**缓解**：
- `backup` 拆成两步：先 dump 到临时存储（事务内），再异步上传（次函数）
- `import-feishu` 拆成多函数：每篇一次调用，不超过 3s

### IR-3: 无固定出口 IP
**现状**：飞书 API 通常允许任意 IP；某些高级 API 需要白名单。
**缓解**：
- 仅用读权限的 wiki / docx API（不需要白名单）
- 如必须白名单，升级 PERSONAL（¥19.9/月）

### IR-10: MCP 滥用
**现状**：公网暴露任何接口都可能被扫。
**缓解**：
- Bearer Token 鉴权（环境变量配置，定期轮换）
- 速率限制：每 IP / 每 Token 200 RPM
- 仅返回 published 文章 + 摘要（≤ 500 字）
- 写接口**绝对不暴露**

### IR-11: 截图敏感信息
**现状**：微信支付、订单等截图可能含 API Key、手机号、订单号。
**缓解**：
- 导入 SOP：人工抽查首批 ≥ 20 篇
- 数据库加 `screenshot.contains_pii` 布尔字段，true 时对站内不展示原图（仅占位）
- 站内搜索不索引 PII 截图的 OCR（v1.1 加 OCR）

## 风险等级分类汇总

| 等级 | 数量 |
|---|---|
| 高 | 3（IR-6, IR-7, IR-11）|
| 中 | 7（IR-1, IR-3, IR-8, IR-9, IR-10, IR-14, IR-15）|
| 低 | 5（IR-4, IR-5, IR-12, IR-13, IR-2 已决策推迟）|

## 阶段风险映射

| Stage | 主要风险 |
|---|---|
| Stage 05 Contracts | API 契约定义不清导致前后端脱节 |
| Stage 06 Engineering | Next.js 15 + CloudBase 静态托管部署兼容性 |
| Stage 07 Task Planning | 任务颗粒度过粗或过细 |
| Stage 08 Implementation | 关键技术（puppeteer / MCP）实现风险 |
| Stage 09 Verification | 自动化测试覆盖不足 |
| Stage 10 Integration | 与 CloudBase PG / 存储的对接问题 |
| Stage 11 Release | 域名、备案、上线流程 |
| Stage 12 Operation | 监控告警未配置 |
| Stage 13 Evolution | 用户需求变化未及时捕获 |