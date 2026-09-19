# INTEGRATION-CHECKLIST — 微信 AI 使用技巧整理站

> Stage 10 交付物。集成期跨模块 / 跨服务验证清单。

## 1. 集成维度

| 维度 | 验证项 |
|---|---|
| 模块间 | Next.js ↔ CloudBase 函数 ↔ Postgres ↔ 存储 |
| 第三方 | 飞书 API ↔ 站点；外部 MCP 客户端 ↔ 站点 |
| 环境 | 本地 ↔ 预览 ↔ 生产（配置差异） |
| 数据流 | 写：导入 / tag 管理 → DB → ISR revalidate → 公网缓存 |
| 事件 | 5 个领域事件（Imported / Merged / Uploaded / Archived / Backup） |
| 失败 | 飞书不可达 / Postgres 超时 / 存储 5xx |

## 2. 关键集成场景

### SC-1 端到端：导入一篇飞书文章到公网可见
1. 飞书 sandbox 创建一篇文档（含 2 张图）
2. 触发 `npm run import:feishu --mode=full`
3. 验证：DB 新增 Article + 2 Screenshot + 1 Tag
4. 验证：存储有 2 张图，URL 可访问
5. 验证：ISR 已 revalidate
6. 验证：公网 `https://wx-ai-tips.example.com/articles/<slug>` 200 + 内容完整
7. 验证：ImportEvent status=succeeded + counts.added=1

**已知风险**：飞书 sandbox 数据准备时间 ~30s

### SC-2 跨模块：Tag 合并 → ISR 失效 → 外链 301
1. 创建 tag X、Y、Z；3 篇文章各关联 X、Y、Z
2. 作者后台触发 merge X、Y → Z
3. 验证：DB 中 ArticleTag 转 Z，X/Y 删除
4. 验证：ISR revalidate 触发（CloudBase 日志可见）
5. 验证：`/tags/x` 301 → `/tags/z`（永久）
6. 验证：原 X/Y 关联文章仍可访问

### SC-3 跨服务：MCP 调用 → FTS → 返回
1. MCP Inspector 配置 `https://wx-ai-tips.example.com/mcp`
2. Bearer Token 写入
3. 调用 `search_articles({query: "微信支付"})`
4. 验证：返回 Top 5 + URL
5. 调用 `get_article({id: "..."})`
6. 验证：返回完整 Markdown + screenshot URLs
7. 验证：调用草稿 id → `ARTICLE_NOT_FOUND`

### SC-4 失败恢复：飞书 API 5xx
1. 飞书 sandbox 模拟 503（mock 或断网）
2. 触发导入
3. 验证：ImportEvent.status=failed
4. 验证：errors 字段含飞书 503 详情
5. 验证：已有数据未损坏
6. 验证：15 分钟后可重试

### SC-5 速率限制
1. 用 ab / wrk 在 1 分钟内发 150 次搜索请求
2. 验证：前 30 次 200，后续 100 次 200，第 131 次起 429
3. 验证：429 含 `Retry-After` 头
4. 验证：1 分钟后限速重置

## 3. 环境差异矩阵

| 配置 | 本地 | 预览 | 生产 |
|---|---|---|---|
| `APP_ENV` | local | preview | production |
| Postgres | docker | CloudBase 预览实例 | CloudBase 生产实例 |
| 存储 | MinIO | CloudBase 预览桶 | CloudBase 生产桶 |
| 飞书 | sandbox | sandbox | 真实 |
| 速率限制 | 关闭 | 同生产 | 同生产 |
| IP 白名单 | 关闭 | 关闭 | 严格 |

## 4. 第三方不可达行为

| 第三方 | 不可达时行为 |
|---|---|
| 飞书 API | 导入报错；ImportEvent.status=failed；UI 显示「暂时无法导入」 |
| Postgres | API 5xx；前端 fallback 显示缓存 |
| CloudBase 存储 | 截图 404；前端显示「图片加载失败」占位 |
| MCP 客户端 | 不影响站点；MCP server 单独 5xx |

## 5. 集成测试命令

```bash
pnpm test:integration        # 集成测试套件
pnpm test:e2e:integration    # 端到端集成（Playwright + 真实后端）
pnpm test:resilience         # 失败注入（chaos）
```

## 6. 待集成问题清单

> 本节在集成期间动态填写。Issue 格式：INT-XXX。

| ID | 描述 | 状态 |
|---|---|---|
| | | |

## 7. 集成完成定义

- [ ] SC-1 ~ SC-5 全部通过
- [ ] 环境差异矩阵已验证
- [ ] 第三方不可达行为已验证
- [ ] 集成问题清单全部关闭或接受
- [ ] TEST-RESULTS.md 记录最新跑测结果
- [ ] INTEGRATION-TEST-RESULTS.md 文档化