# Async Events — 微信 AI 使用技巧整理站

> Stage 05 交付物。异步事件契约与处理语义。

## 1. 事件总线 = 数据库表 + 函数触发

本项目**不引入独立消息队列**。异步事件通过 CloudBase 存储 / Postgres 表 + HTTP 函数组合实现。简单、可观测、FREE 层内可承载。

## 2. 事件清单

### EV-1: ArticleImported（导入完成）
- **触发者**：import-feishu 函数（成功完成时）
- **载荷**：
  ```json
  {
    "importEventId": "uuid",
    "added": ["slug1", "slug2"],
    "updated": ["slug3"],
    "failed": [{ "slug": "x", "message": "..." }],
    "timestamp": "2026-09-19T11:30:00Z"
  }
  ```
- **下游消费者**：
  - Next.js ISR revalidate（调用 CloudBase 静态托管 revalidate API）
  - 站内首页缓存失效
- **重试语义**：at-most-once；如 ISR revalidate 失败，下一次导入会重新覆盖

### EV-2: TagMerged（标签合并）
- **触发者**：admin/tags/merge 函数
- **载荷**：
  ```json
  {
    "mergeId": "uuid",
    "fromSlugs": ["x", "y"],
    "toSlug": "z",
    "affectedArticles": 12,
    "timestamp": "..."
  }
  ```
- **下游消费者**：
  - ISR revalidate `/tags/[slug]`
  - 日志审计

### EV-3: ScreenshotUploaded（截图上传）
- **触发者**：import-feishu 内调用存储上传
- **载荷**：
  ```json
  {
    "screenshotId": "uuid",
    "articleId": "uuid",
    "storageKey": "screenshots/2026/09/abc.png",
    "mimeType": "image/png",
    "size": 234567
  }
  ```
- **下游消费者**：
  - 更新 article.contentMarkdown 中的图片引用
  - 不触发 ISR（页面 markdown 已含图）

### EV-4: ArticleArchived（文章归档）
- **触发者**：admin/tags/{slug} DELETE 或 admin/articles/{slug} DELETE
- **载荷**：
  ```json
  {
    "articleId": "uuid",
    "slug": "x",
    "archivedAt": "...",
    "by": "author"
  }
  ```
- **下游消费者**：
  - ISR revalidate `/articles/[slug]`（返回 410）
  - 站内搜索移除该文章（DB 触发器自动）

### EV-5: BackupCompleted（备份完成）
- **触发者**：backup-weekly cron
- **载荷**：
  ```json
  {
    "backupId": "uuid",
    "type": "weekly",
    "dbDumpKey": "backups/db-2026-09-19.sql.gz",
    "screenshotsCount": 23,
    "sizeBytes": 1234567,
    "durationMs": 4500
  }
  ```
- **下游消费者**：
  - 监控告警（如失败）
  - 写入 ImportEvent 同类审计表

## 3. 事件命名约定

`<Entity><PastTenseVerb>`，如 `ArticleImported`、`TagMerged`。

## 4. 重试 / 顺序 / 重复投递

| 维度 | 策略 |
|---|---|
| 重试 | 下游 ISR revalidate 失败 → 下次导入时重试 |
| 顺序 | 同一实体的多个事件按 `timestamp` 升序处理 |
| 重复投递 | 事件载荷含幂等键（slug / id）；下游用 `INSERT ... ON CONFLICT` 或 `revalidatePath(idempotent)` |
| 持久化 | 事件载荷写入 `import_events` / `audit_logs` 表 |

## 5. 错误事件

- 函数异常 → CloudBase 自动捕获并写入函数日志
- 不构造专门的 error event；错误通过 ImportEvent.status=failed + errors 字段表达

## 6. 跨函数通信

- 函数间不直接调用，全部走数据库或存储
- 触发通过 CloudBase 存储事件通知（如上传截图后触发后续处理函数）

## 7. 未来升级路径

若异步复杂度上升：
- 引入 CloudBase 消息队列（消息队列 KMQ）
- 或迁移到 Cloudflare Queues / AWS SQS