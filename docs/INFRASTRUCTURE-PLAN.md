# INFRASTRUCTURE-PLAN — 微信 AI 使用技巧整理站

> Stage 04a 交付物。基础设施选型与配置。
> **核验日期：2026-09-19**（基于 https://www.tencentcloud.com/zh/document/product/1266/70296?lang=zh 与 https://docs.cloudbase.net/）

## 1. 总览

| 项 | 选型 | 套餐 | 备注 |
|---|---|---|---|
| 后端 BaaS | CloudBase（腾讯云开发） | **FREE（¥0/月）+ 按量付费** | 用户决策 2026-09-19 |
| 数据库 | CloudBase Postgres（标准 Postgres） | FREE + 按量 | 与 Supabase API 高度兼容 |
| 对象存储 | CloudBase 存储 | FREE + 按量 | CDN 加速内置 |
| 前端托管 | CloudBase 静态托管（Next.js 15） | FREE | 含 CDN |
| 函数 | CloudBase HTTP 触发函数 | FREE | 3s 超时 / 256MB 内存 |
| 备份 | CloudBase 函数（pg_dump → 存储） | FREE + 按量 | 周备 cron |

## 2. 各组件限额与配置

### 2.1 CloudBase FREE 套餐（2026 年新计费模型）
- **资源点**：3,000 点/月（资源池，跨数据库/函数/存储/CDN）
- **资源点换算**（约）：
  - 函数计算：按 CU × 时长
  - 存储：按 GB × 时长
  - CDN 流量：按 GB
- **环境**：每个账号 1 个免费环境
- **续期**：单次 6 个月，到期前 1 个月可续
- **限制**：
  - 函数超时 3s / 内存 256MB（个人版硬限制，FREE 继承）
  - 无固定出口 IP
  - 日志保存 2 小时
  - QPS 500
  - 自定义域名 1 个
  - 静态托管 1GB
  - 计算 15 万 CU/月
  - 调用次数 20 万/月
  - 外网出流量 4 GB/月
  - CDN 回源流量 10 GB/月

### 2.2 按量付费（超限后启用，需用户手动开启"超限不停服"）
- 调用次数：$0.07 / 万次/日
- 容量：$0.03 / GB/日
- 计算资源：$0.000037 / GBs/日
- 外网出流量：$0.26 / GB/日
- 存储流量：$0.07 / GB/日
- CDN 回源：$0.05 / GB/日

### 2.3 PostgreSQL（CloudBase PG）
- 与 Supabase API 高度兼容（@cloudbase/js-sdk、PostgREST）
- 行级安全（RLS）支持
- pgvector / 全文检索 / 触发器 / 数据库函数均可用
- 共享实例池；自动暂停（个人版默认开启，可手动唤醒）
- **未明确**（待与官方文档进一步核实）：连接数上限、单库最大容量、QPS

### 2.4 云函数
- Node.js 18 / 20 运行时
- HTTP 触发 + 定时触发 + 事件触发
- 256MB 内存 / 3s 超时（个人版）—— **本项目只放轻量函数**：导入、tag 管理、备份、MCP server、搜索
- 不能跑 puppeteer / 长连接服务

### 2.5 CloudBase 存储
- 文件上传 / 下载 / 临时链接
- 图片处理（万象能力）
- CDN 加速（365 天缓存）
- 自定义缓存配置
- **未明确**（待核实）：最大单文件大小、QPS

### 2.6 静态托管
- 1GB 免费空间
- 自动 HTTPS + 全球 CDN
- 自定义域名支持（1 个）
- 历史路由（Next.js 必需）

## 3. 部署拓扑

```
飞书 (lark-cli)
   │ HTTPS
   ▼
本地开发机 ◀──── 作者 (npm run import:all)
   │ tcb CLI
   ▼
┌────────────────────────────────────────────┐
│ CloudBase FREE 环境                         │
│                                            │
│  ┌──────────────┐    ┌──────────────────┐  │
│  │ 静态托管     │    │ HTTP 触发函数     │  │
│  │ Next.js 15   │    │ - mcp-server     │  │
│  │ (SSG+ISR)    │    │ - import-feishu  │  │
│  │              │    │ - admin-tags     │  │
│  └──────┬───────┘    │ - search         │  │
│         │            │ - backup-weekly  │  │
│         ▼            └────────┬─────────┘  │
│  ┌──────────────┐            │             │
│  │ CloudBase    │◀───────────┘             │
│  │ Postgres     │                          │
│  │ (articles,   │                          │
│  │  tags,       │                          │
│  │  screenshots │                          │
│  │  import_events)│                         │
│  └──────────────┘                          │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ CloudBase 存储                        │  │
│  │ - screenshots/                        │  │
│  │ - backups/                            │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
   ▲                              ▲
   │ HTTPS                        │ MCP Streamable HTTP
   │                              │
浏览器读者                    外部 LLM Agent
```

## 4. 关键约束与应对

| 约束 | 应对 |
|---|---|
| 函数超时 3s | 所有函数逻辑必须 < 3s；MCP 查询用 Postgres FTS 通常 < 300ms |
| 函数内存 256MB | 不可装 chromium；puppeteer 在 v1.1 移到 CloudRun |
| 无固定出口 IP | 飞书 API 配置允许任意 IP；若必须白名单则申请 STANDARD |
| QPS 500 | 预留充足；按需开启 CDN 缓存 |
| 日志 2 小时 | 关键错误本地也记一份（lark-cli 或本地日志） |
| 数据库自动暂停 | 个人版默认；可手动唤醒；首次访问 ~1s 延迟 |
| 单免费环境 | 一个项目足矣；备份时注意 |

## 5. 待核实清单（U1-U4 收尾）

| ID | 项 | 状态 |
|---|---|---|
| U1 | CloudBase FREE 层具体资源点换算 | ⏳ 2026-09-19 第三方文章核到 3000 点/月；详细换算需在 Stage 06 工程实测 |
| U2 | puppeteer 在 CloudBase 函数内可行性 | ❌ 已确认**不可行**（256MB / 3s 限制）→ 推迟到 v1.1 + CloudRun |
| U3 | 飞书 vs 多维表格作为源 | ✅ 用户决策用飞书知识库 / 多维表格 |
| U4 | MCP 协议宿主兼容 | ✅ 已决策 Streamable HTTP + CloudBase HTTP 函数 |
| U5 | Postgres 连接数 / 容量上限 | ⏳ 待 Stage 06 数据库初始化时核 |
| U6 | 存储单文件大小限制 | ⏳ 待 Stage 06 截图上传测试时核 |

## 6. 迁移触发条件

| 触发 | 迁移到 |
|---|---|
| 月资源点 > 2500（80%）| 评估是否升级到 PERSONAL（¥19.9/月）或按量付费 |
| 函数 3s 超时不够 | 拆分逻辑 / 升级 STANDARD |
| 需要固定出口 IP（飞书白名单要求）| 升级 PERSONAL |
| Cheat Sheet v1.1 启用 | CloudRun 容器模式（独立计费） |
| 文章数 > 5000 / 搜索 P95 > 500ms | 加 Meilisearch（独立托管） |