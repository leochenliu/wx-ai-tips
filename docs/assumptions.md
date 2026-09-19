# Assumptions & Risks — 微信 AI 使用技巧整理站

> Stage 01 交付物。透明记录假设、未知、风险，便于后续决策。

## 假设（Assumptions）
- A1：飞书知识库 / 多维表格中的文章字段足够规范（标题 / 正文 / 截图 / 标签），无需清洗脚本外的额外治理
- A2：CloudBase 免费层在当前用量下足够（数据库连接数、存储容量、函数调用次数、月带宽）
- A3：单次 Cheat Sheet 生成 < 10 秒（取决于 puppeteer 冷启动；必要时用 CloudBase 函数预热）
- A4：公网访问合规允许直接展示微信产品截图（含微信支付、公众号等界面）
- A5：用户已具备 CloudBase 账号、飞书自建应用权限（lark-cli 已配置）

## 未知（Unknowns — 需核实）
- U1：CloudBase 数据库免费层连接数 / 存储 / 函数调用次数的最新限额 → **待核实**
- U2：puppeteer 在 CloudBase 函数内的可行性（vs Playwright / weasyprint）→ **待核实**
- U3：飞书知识库 vs 多维表格作为源的区别（哪个字段更全？哪个 API 更好用？）→ **待用户确认**
- U4：MCP server 的传输协议（stdio / SSE / streamable-http）宿主要求 → **待 Stage 04a 选型时确认**

## 风险（Risks）
| ID | 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|---|
| R1 | 飞书 API 限流 | 中 | 中 | 增量同步 + 退避重试 + 本地缓存 |
| R2 | CloudBase 出口 IP 在某些地区被微信生态屏蔽 | 中 | 中 | 截图走 CloudBase 存储 + CDN；不直连微信 |
| R3 | 截图含敏感信息（订单、API Key） | 高 | 高 | 导入时强制走打码流程；二次确认清单 |
| R4 | 单点故障：数据库只删存没人备份 | 中 | 高 | 周备 + 月备；备份脚本纳入 cron |
| R5 | puppeteer 冷启动慢导致 Cheat Sheet 超时 | 中 | 中 | 预热实例或换 weasyprint |
| R6 | MCP 接口被滥用（爬全库） | 中 | 中 | 速率限制 + 仅返回摘要 + 不暴露删除接口 |

## 暂未达成共识
- 域名：是否已有托管域名？没有的话用 CloudBase 默认域名 + Cloudflare Pages 子域
- 站点名称 / 标题：未命名
- 是否要 SEO 友好（meta、sitemap、robots.txt）— MVP 默认开启
- 站点 logo / 主色调