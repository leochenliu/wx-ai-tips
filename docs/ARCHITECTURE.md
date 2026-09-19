# Architecture — 微信 AI 使用技巧整理站

> Stage 04 交付物。版本 v0.9 draft。

## 1. 选型方法

按 SKILL.md 原则 "先避免过度抽象"，先列出 3 个候选方案，比较后选 1。

## 2. 候选方案对比

| 维度 | A. Next.js App Router + CloudBase（**推荐**） | B. Astro 静态站 + CloudBase | C. 纯 SPA (Vite/React) + CloudBase |
|---|---|---|---|
| SEO | ✅ SSR + ISR | ✅ SSG 最佳 | ❌ 仅 CSR，SEO 弱 |
| 交互（搜索 / 后台） | ✅ RSC + Client Component | ⚠️ 需 islands | ✅ 完整交互 |
| CloudBase 集成 | ✅ 一等公民（Vercel 兼容） | ⚠️ 自行拼 | ⚠️ 自行拼 |
| MCP 函数共存 | ✅ Next.js + CloudBase 函数并存 | ✅ | ✅ |
| 部署复杂度 | 中（一套构建） | 中（前端 + 函数两套） | 中（前端 + 函数两套） |
| 学习曲线 | 中 | 低 | 低 |
| 适合本项目 | ⭐ SEO 强 + 单仓 + 函数并存 | 内容站极佳但搜索交互需 islands | SEO 弱点放弃 |

**决策**：选 **A. Next.js App Router + CloudBase 函数 + CloudBase Postgres + CloudBase 存储 + CloudBase MCP**。

理由：
- 内容站 SEO 是刚需，SSR/ISR 必备
- Next.js 与 CloudBase 函数可共用同一数据库、同一鉴权
- ISR 让文章变更能在不重建站点的情况下增量更新
- 单仓管理降低运维成本

## 3. 系统拓扑

```
                  ┌─────────────────────┐
                  │   公网读者 / Agent   │
                  └──────────┬──────────┘
                             │ HTTPS
                  ┌──────────▼──────────┐
                  │  CloudBase 前端托管 │
                  │  (Next.js 静态+SSR)  │
                  └──────┬──────────────┘
                         │ /api/* (Next.js route handlers)
                  ┌──────▼──────────────┐
                  │  CloudBase 函数层    │
                  │  - mcp-server        │
                  │  - import-feishu     │
                  │  - cheatsheet-pdf    │
                  │  - cheatsheet-png    │
                  │  - backup-weekly     │
                  └──────┬──────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
   ┌────────────────────┐ ┌────────────────────┐
   │ CloudBase Postgres │ │ CloudBase 存储      │
   │  - articles         │ │  - screenshots/    │
   │  - tags             │ │  - cheat-pdfs/    │
   │  - article_tags     │ │  - cheat-pngs/    │
   │  - screenshots      │ │  - backups/        │
   │  - import_events    │ └────────────────────┘
   └────────────────────┘
              ▲
              │ HTTPS
   ┌──────────┴──────────┐
   │   飞书 (lark-cli)   │
   │  - wiki.read        │
   │  - docx.document    │
   └────────────────────┘
```

## 4. 模块划分

### 4.1 前端（Next.js App Router）
- `/` 首页（精选 + 最新 + 热门 tag）
- `/articles` 文章列表
- `/articles/[slug]` 文章详情（ISR，revalidate=300s）
- `/tags` tag 列表
- `/tags/[slug]` tag 过滤文章
- `/search` 搜索结果
- `/admin` 作者后台（IP 白名单）
  - `/admin/tags` tag CRUD + 合并
  - `/admin/import` 导入触发
- 共享组件：Header / Footer / SearchBox / TagCloud / ArticleCard / Markdown

### 4.2 CloudBase 函数
- `import-feishu`：拉飞书知识库 / 多维表格；幂等 upsert
- `cheatsheet-pdf`：puppeteer 渲染 PDF → 存 CloudBase 存储 → 返回 URL
- `cheatsheet-png`：puppeteer 渲染 PNG（1080×1440）→ 存 → 返回 URL
- `mcp-server`：暴露 MCP stdio/SSE 三个接口
- `backup-weekly`：cron，周日 03:00

### 4.3 数据层
- 5 张表：`articles`、`tags`、`article_tags`、`screenshots`、`import_events`
- 索引：`articles.slug`、`articles.published_at`、`articles.search_tsv`（FTS）、`tags.slug`、`article_tags(article_id, tag_id)` UNIQUE
- 备份：cron → sql 导出到 `backups/` 存储目录

### 4.4 异步任务
- Cheat Sheet 生成：用户点击 → 函数异步 → 完成后前端轮询 / 返回
- 导入：手动触发（CLI 或后台按钮），记录 ImportEvent

### 4.5 外部系统边界
- 飞书：仅 import-feishu 调用，凭证仅在该函数环境
- MCP：仅读接口，外部客户端无法触达写路径

## 5. 关键技术选型

| 项 | 选 | 理由 |
|---|---|---|
| 前端框架 | Next.js 15 App Router | SSR/ISR + 函数同仓 |
| UI | shadcn/ui + Tailwind | 无锁定、可定制 |
| Markdown | react-markdown + remark-gfm | 标准 |
| 数据库 | CloudBase Postgres (Postgres 16) | 与函数同账号 |
| 全文搜索 | Postgres FTS（zhparser） | 零额外组件；MVP 足够 |
| 对象存储 | CloudBase 存储 | 同账号 |
| PDF/PNG | CloudBase 函数内 puppeteer（待验证）/ 备 Playwright | 通用渲染 |
| MCP | stdio（SSE v2 备） | 通用 |
| 部署 | CloudBase 前端托管 + 函数 | 单平台 |
| 监控 | CloudBase 控制台 + 自托管 Uptime Kuma（可选） | 免费 |

## 6. 数据流（关键场景）

### 6.1 用户读文章
1. 浏览器 GET `/articles/[slug]`
2. Next.js ISR 命中缓存 → 返回 HTML（首屏 100ms 内）
3. 若未命中，Next.js → DB 查询 → 渲染 → 缓存
4. 图片懒加载从 CloudBase 存储 CDN 拉

### 6.2 作者导入
1. 作者本地执行 `npm run import:all` 或后台触发
2. import-feishu 函数：
   - 创建 ImportEvent (running)
   - 拉飞书文档列表
   - 对每篇：拉正文 / 下载图片 → 存存储 → upsert Article + Screenshot + ArticleTag
   - 更新 ImportEvent (succeeded/failed)
3. ISR 失效（revalidate path）
4. 公网可见

### 6.3 Cheat Sheet
1. 读者点击"生成 PDF" → POST `/api/cheatsheet` {articleId, format}
2. Next.js route handler 调度 CloudBase 函数
3. 函数拉 Article + Screenshot → puppeteer 渲染 → 上传存储 → 返回 URL
4. 前端展示下载链接

### 6.4 Agent MCP 调用
1. 外部 Agent 调 `mcp.search_articles(query)`
2. CloudBase mcp-server 函数：查 Postgres FTS → 返回 JSON
3. 不暴露任何写入工具

## 7. 跨切关注

| 关注 | 落点 |
|---|---|
| 安全 | Next.js 路由鉴权（CloudBase Access）+ 函数 IP 白名单 |
| 速率限制 | CloudBase API 网关（HTTP 触发函数）|
| 日志 | CloudBase 函数日志 + 前端 Sentry（v1.1） |
| 备份 | cron + 异地（v1.1 上 GitHub Releases） |
| 部署 | GitHub Actions → CloudBase CLI（见 ENVIRONMENTS.md） |

## 8. 风险与未决

| ID | 项 | 状态 |
|---|---|---|
| AR-1 | puppeteer 在 CloudBase 函数内可行性 | U2 待核实 |
| AR-2 | CloudBase 免费层数据库连接数 / 存储 / 函数调用次数 | U1 待核实 |
| AR-3 | MCP 传输协议宿主兼容（stdio vs SSE） | U4 待核实 |
| AR-4 | zhparser 是否在 CloudBase Postgres 默认开启 | **待 Stage 04a 选型时确认** |