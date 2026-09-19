# PROJECT-INTAKE — 微信 AI 使用技巧整理站

> Stage 00 交付物。本文件由 agentic-web-dev 技能于 2026-09-19 生成；后续每个阶段确认/变更需追加 changelog。

## 一、项目模式
- **新建（greenfield）**
- 仓库根：`C:\Users\leo\WorkBuddy\2026-09-19-11-06-46\`
- 当前状态：仅有 `.workbuddy/memory/` 工作元数据，无任何源码、文档、依赖文件

## 二、用户已确认目标能力
1. 内容管理：文字 + 截图（图文混排）
2. 全文搜索（关键词 / 模糊）
3. 标签系统：能为不同文章重建索引（Tag ↔ Article 多对多）
4. Cheat Sheet 生成（一页可打印/可分享的速查表）
5. 接入 MCP（云服务类）

## 三、Stage 00 已澄清的决策
| 项 | 选择 | 含义 |
|---|---|---|
| 部署形态 | **公网可访问的公开站** | 需 CDN/静态托管 + 公开域名 |
| 内容来源 | **从某个外部知识库导入** | 一次性导入 + 增量同步脚本 |
| MCP 类型 | **云服务类**（数据库/鉴权/存储通过 MCP 暴露） | 需选一家云服务作 Source of Truth |
| 作者规模 | **单人**（你自己） | 无登录系统，写入走本地编辑器或后台单密钥 |

## 四、待确认（阻塞项）
- [ ] **外部知识库具体是哪一家**（Notion / 飞书 / 印象笔记 / 得到大脑）— 决定导入脚本与字段映射
- [ ] **云服务具体选型**（CloudBase / Supabase / Neon）— 决定数据库、鉴权、存储协议
- [ ] 域名（是否已有；若无，使用 `*.pages.dev` / `*.vercel.app` 子域名兜底）
- [ ] 截图存储位置（与文章同库 vs 单独对象存储）
- [ ] Cheat Sheet 输出形态（HTML / PDF / Markdown 三选一或全要）

## 五、免费层 / 成本候选（非强制）
- 前端：React + TypeScript + Vite；可换 Vue/Svelte
- 静态托管：Cloudflare Pages / Vercel / Netlify（均有免费层）
- API：Cloudflare Workers / Node 服务
- 数据库：Postgres（Neon 免费层）/ Supabase / CloudBase Postgres
- 对象存储：R2 / Supabase Storage / CloudBase 存储
- 搜索：Postgres FTS（轻量）/ Meilisearch（更强大）/ Typesense

> ⚠️ 免费额度、价格、限制会变。**实际启用前必须查官方文档并记录核验日期**。本表仅作候选，不构成承诺。

## 六、约束与风险（初版）
- 内容来自第三方知识库 → 版权 / 引用规范需评估；导入时保留原始链接与署名
- 公网部署 → 需评估敏感截图（API Key、订单截图、付费界面）打码流程
- 单人维护 → 需明确"删除/编辑/撤回"流程与数据备份节奏
- MCP 暴露数据库 → 仅暴露最小权限；不暴露删除/导出 API 给外部客户端

## 七、Stage 00 退出条件
- [x] 项目模式识别（新建）
- [x] 关键约束清晰（公网 + 外部导入 + MCP + 单人）
- [ ] 阻塞项已解决（见第四节）

## 八、下一步
进入 **Stage 01 Discovery**：
- 用户故事与场景清单
- 内容数据结构（Article / Tag / Screenshot / CheatSheet 实体）
- 关键用户旅程（导入 → 阅读 → 搜索 → 打标 → 生成 Cheat Sheet）

---

_本文件由 WorkBuddy / agentic-web-dev 技能生成，未经用户批准前不创建任何资源、不启用任何计费。_