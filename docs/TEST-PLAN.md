# TEST-PLAN — 微信 AI 使用技巧整理站

> Stage 09 交付物。测试矩阵与策略。

## 1. 测试金字塔

```
        ┌──────────────┐
        │   E2E (少量)  │   ← Playwright，关键用户旅程
        ├──────────────┤
        │  集成 (中等)  │   ← Vitest + testcontainers，API + DB
        ├──────────────┤
        │  单元 (大量)  │   ← Vitest，业务逻辑 + 工具
        └──────────────┘
```

## 2. 测试矩阵

### 2.1 单元测试（Vitest）
| 模块 | 测试点 | 数量目标 |
|---|---|---|
| `lib/adapters/lark-client.ts` | 飞书 API 调用 / 错误处理 | ≥ 8 |
| `lib/adapters/storage.ts` | 上传 / 下载 / URL 解析 | ≥ 5 |
| `lib/repositories/article-repo.ts` | upsert / 软删 / 归档 | ≥ 10 |
| `lib/repositories/tag-repo.ts` | CRUD / 合并 / 重命名 | ≥ 10 |
| `lib/domain/*.ts` | 状态机 / 不变量校验 | ≥ 6 |
| `app/api/**/route.ts` | 参数校验 / 错误码 | 每接口 ≥ 3 |
| `cloudbase-functions/mcp-server/*` | 三个 tool 的输入输出 | ≥ 9 |

### 2.2 集成测试（Vitest + testcontainers）
| 场景 | 数据库 | 验证 |
|---|---|---|
| 导入 1 篇文章 | postgres:16-alpine | Article + Screenshot + ArticleTag 全部写入 |
| 软删 article | DTO | 软删后 archive_at 有值，30 天后被 cron 删除 |
| Tag 合并 | DTO | ArticleTag 转目标 tag，原 tag 删除 |
| Tag 重命名 | DTO | aliases 含旧 slug；GET /tags/old-slug 301 |
| 搜索 | DTO | FTS 命中预期文章 |
| MCP search_articles | DTO | 返回 Top N + relevance |

### 2.3 组件测试（Testing Library）
| 组件 | 验证 |
|---|---|
| `<SearchBox>` | 输入 → debounce 300ms → 触发查询 |
| `<ArticleCard>` | 渲染标题/摘要/tag/封面 |
| `<TagCloud>` | 显示频率；点击触发导航 |
| `<Markdown>` | 渲染代码块/表格/链接 |
| `<Screenshot>` | 懒加载 + containsPii 占位 |

### 2.4 E2E（Playwright）
| 旅程 | 验证 |
|---|---|
| 读者：首页 → 详情页 | 200 + 内容渲染 |
| 读者：搜索 → 结果 → 详情 | 命中 |
| 读者：tag 页 → 文章列表 | 过滤 |
| 读者：访问软删文章 | 410 Gone |
| 作者（IP 白名单）：登录后台 → 创建 tag | 201 |
| 作者：合并 tag → 验证外链 | 旧 slug 301 |
| 外部 Agent：MCP search | JSON-RPC 响应 |

## 3. 测试数据策略

### 3.1 本地开发
- `db/seed.sql`：5 篇文章 + 3 个 tag + 10 张截图（从公共 CC0 图）
- 每个测试用独立 schema（`SET search_path TO test_xxx`）

### 3.2 CI
- 每次 PR 创建临时 schema
- 用 testcontainers 启动 Postgres 16
- 跑完自动清理

### 3.3 预览 / 生产
- 预览：每次 PR 一个独立 schema
- 生产：**绝对不跑测试**

## 4. Mock 策略

| 第三方 | Mock 方式 |
|---|---|
| 飞书 API | MSW（Mock Service Worker）拦截 + 录制回放 |
| CloudBase 存储 | 本地 MinIO |
| CloudBase 函数 | testcontainers 跑真实函数 |
| Postgres | testcontainers |
| MCP 客户端 | MCP Inspector 真实联通 |

## 5. 性能测试（k6）

### 5.1 目标（来自 NFR）
| 场景 | P95 |
|---|---|
| 列表页 | < 500ms |
| 搜索 | < 300ms |
| 文章详情 | < 500ms |
| MCP search | < 500ms |

### 5.2 脚本
`tests/perf/list.js`、`tests/perf/search.js`、`tests/perf/article.js`

### 5.3 跑法
```bash
docker run -i grafana/k6 run - <tests/perf/list.js
```

## 6. 安全测试

| 项 | 工具 | 频次 |
|---|---|---|
| 依赖漏洞扫描 | `pnpm audit` + Snyk 免费层 | 每次 PR |
| 静态代码分析 | Semgrep + ESLint security rules | 每次 PR |
| 渗透测试 | OWASP ZAP（基础扫描）| 发布前 |
| Secret 扫描 | `gitleaks` | 每次 PR |

## 7. 验收对照（ACCEPTANCE-CRITERIA.md G1-G7）

每个 G 验收对应一组测试：

| G | 测试来源 |
|---|---|
| G1 内容 | E2E：人工抽查 |
| G2 功能 | E2E + 集成测试 |
| G3 性能 | k6 跑 |
| G4 安全 | 渗透测试 + secret 扫描 |
| G5 备份 | 手动恢复演练 |
| G6 文档 | 检查清单 |
| G7 监控 | 手动验证告警 |

## 8. 未覆盖项

- 飞书 API 限流场景（IR-8）：靠导入脚本的退避重试 + 监控
- CloudBase 区域故障（IR-13）：靠备份恢复
- 截图 OCR（v1.1）：本期不测

## 9. 测试命令

```bash
pnpm test              # 单元
pnpm test:watch        # 单元（开发用）
pnpm test:e2e          # E2E
pnpm test:integration  # 集成
pnpm perf:list         # k6 列表
pnpm perf:search       # k6 搜索
```