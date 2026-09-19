# AGENTS.md — 微信 AI 使用技巧整理站

> 工程基线。本文件供 AI Agent / 协作者快速理解项目边界、命令与禁止事项。

## 项目模式
- **新建项目**，单人维护
- 仓库根：`C:\Users\leo\WorkBuddy\2026-09-19-11-06-46\`（开发时由你 fork 到 git 仓库）
- 当前阶段：**Stage 06 工程基线**（设计阶段已完成 00–05）

## 文档地图（先读这些再动手）
- `docs/PROJECT-INTAKE.md` → Stage 00
- `docs/problem-statement.md` `user-personas.md` `user-journeys.md` `mvp-scope.md` `assumptions.md` → Stage 01 Discovery
- `docs/PRD.md` `USER-STORIES.md` `ACCEPTANCE-CRITERIA.md` `REQUIREMENTS-TRACEABILITY.md` → Stage 02 Specification
- `docs/DOMAIN-MODEL.md` `GLOSSARY.md` `DOMAIN-INVARIANTS.md` `STATE-MACHINES.md` → Stage 03 Domain
- `docs/ARCHITECTURE.md` `CONTEXT-DIAGRAM.md` `docs/ADRs/*` `docs/ENVIRONMENTS.md` → Stage 04 Architecture
- `docs/INFRASTRUCTURE-PLAN.md` `COST-REGISTER.md` `VENDOR-LOCK-IN-REVIEW.md` `INFRASTRUCTURE-RISKS.md` → Stage 04a Infrastructure
- `docs/openapi.yaml` `API-ERRORS.md` `MCP-CONTRACT.md` `docs/schemas/*` `docs/events/*` → Stage 05 Contracts
- `docs/PHASE-REPORT.md` → 阶段记录（每个阶段写一份）

## 技术栈
- 前端：Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui
- 数据库：CloudBase Postgres（pg 直连，@cloudbase/js-sdk 兼容 Supabase API）
- 函数：CloudBase HTTP 触发函数（Node.js 20）
- 存储：CloudBase 存储
- MCP：Streamable HTTP（@modelcontextprotocol/sdk）
- 全文搜索：Postgres FTS（zhparser / simple）
- 包管理：**pnpm**（推荐）

## 必备命令

### 安装
```bash
pnpm install
```

### 本地开发
```bash
# 启动 Next.js dev server
pnpm dev

# 启动本地 Postgres + MinIO（如未使用 CloudBase 远程）
docker compose up -d
```

### 质量门
```bash
pnpm lint           # ESLint
pnpm typecheck      # TypeScript
pnpm test           # Vitest
pnpm test:e2e       # Playwright
pnpm format         # Prettier --write
```

### 数据库
```bash
# 应用迁移到本地 Postgres
pnpm db:migrate

# 生成新迁移（修改 db/schema/*.sql 后）
pnpm db:diff
```

### 构建与部署
```bash
pnpm build          # Next.js 生产构建
pnpm deploy:preview # CloudBase 预览环境
pnpm deploy:prod    # CloudBase 生产环境（需人工确认）
```

### 数据导入
```bash
pnpm import:feishu --mode=full           # 全量
pnpm import:feishu --mode=incremental    # 增量
```

## 目录结构

```
/
├── AGENTS.md             ← 本文件
├── README.md             ← 给人看的项目说明
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── next.config.mjs
├── eslint.config.js
├── prettier.config.js
├── docker-compose.yml    ← 本地开发依赖
├── .env.example          ← 环境变量模板（提交到 git）
├── .gitignore
├── app/                  ← Next.js App Router
│   ├── page.tsx          ← 首页
│   ├── articles/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── tags/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── search/page.tsx
│   ├── admin/            ← IP 白名单
│   │   ├── tags/
│   │   └── imports/
│   └── api/
│       ├── articles/
│       ├── tags/
│       ├── search/
│       ├── admin/
│       └── mcp/route.ts  ← MCP Streamable HTTP 端点
├── components/           ← 共享 React 组件
├── lib/                  ← 业务逻辑
│   ├── adapters/         ← 防腐蚀层（数据库 / 存储 / 飞书）
│   ├── domain/           ← 领域模型（与 Stage 03 对应）
│   └── repositories/     ← Repository 接口与实现
├── cloudbase-functions/  ← CloudBase 函数
│   ├── mcp-server/
│   ├── import-feishu/
│   ├── admin-tags/
│   └── backup-weekly/
├── db/
│   ├── migrations/       ← 数字前缀的 SQL 文件
│   └── seed.sql          ← 测试数据（仅本地）
├── docs/                 ← 设计文档（已存在）
└── .github/
    └── workflows/
        ├── ci.yml
        └── deploy.yml
```

## 环境变量

复制 `.env.example` 为 `.env.local` 后填写。**绝对不要把 `.env.local` 提交到 git**。

详见 `.env.example` 中的注释。

## 禁止事项

### 写代码时
- ❌ 不要把任何密钥、Token、密码提交到 git
- ❌ 不要在文章正文硬编码 PII（手机号、API Key、订单号）
- ❌ 不要绕过不变量检查（I-1 ~ I-7）
- ❌ 不要新增未在 ADR 中讨论的供应商 SDK（避免锁定）
- ❌ 不要修改 `docs/openapi.yaml` 后不更新对应的实现

### 操作基础设施时
- ❌ 不要未经用户确认在生产环境执行 DDL（建表 / 删表）
- ❌ 不要启用 CloudBase 按量付费 / 升级套餐未经用户确认
- ❌ 不要删除 `db/migrations/*` 中已应用的文件
- ❌ 不要把数据库连接字符串写进前端 bundle

### 修改飞书数据时
- ❌ 不要直接调用飞书写接口（避免污染源）
- ❌ 不要在导入脚本里跳过截图打码 SOP

## 验证清单（每个 PR）

- [ ] `pnpm lint` 通过
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] 新增的领域逻辑有单元测试
- [ ] 新增的 API 接口对应 `docs/openapi.yaml` 已更新
- [ ] 数据库变更对应新迁移文件已创建
- [ ] 未引入新的供应商 SDK

## 找 AI 帮忙的边界

✅ 适合 AI 帮忙：
- 写 Next.js 页面 / 组件
- 写 CloudBase 函数
- 写 SQL 迁移
- 写测试用例
- 跑命令并报告输出
- 在 `docs/` 中增补设计文档

❌ 不适合 AI 单独做：
- 启用 CloudBase 计费 / 升级套餐
- 在生产数据上跑破坏性 SQL
- 修改不可变备份文件
- 公开部署 / 切换域名
- 修改鉴权 Token

## 紧急情况

- **数据库连不上**：检查 CloudBase PG 是否自动暂停；手动唤醒
- **函数返回 5xx**：看 CloudBase 函数日志的 traceId
- **截图打不开**：检查 storage_key 是否仍存在（CDN 缓存 365 天）
- **MCP 不通**：检查 Bearer Token 是否过期；Origin 头是否合规
- **飞书导入失败**：看 ImportEvent.errors；按错误重试或人工处理