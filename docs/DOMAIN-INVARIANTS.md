# Domain Invariants — 微信 AI 使用技巧整理站

> Stage 03 交付物。**不变量 = 系统必须始终为真的约束**。违反不变量视为系统级 bug。

## I-1 Article 相关

| ID | 不变量 | 检查层 |
|---|---|---|
| I-1.1 | `Article.slug` 全表唯一 | DB unique index |
| I-1.2 | `Article.status = published` 时，`title` 与 `content_markdown` 均非空 | DB check + 应用层校验 |
| I-1.3 | `Article.status = published` 时，`published_at` 非空 | DB check |
| I-1.4 | 一篇 published Article 至少要能被展示（即至少有 slug） | 应用层校验 |
| I-1.5 | `Article.source_url` 一旦写入不可修改（保留追溯性） | 应用层校验 |
| I-1.6 | archived Article 在 30 天后被硬删（定时任务） | cron job |
| I-1.7 | 同一篇 Article 不允许同时存在两条 ArticleTag 指向同一 Tag | DB unique (article_id, tag_id) |

## I-2 Tag 相关

| ID | 不变量 | 检查层 |
|---|---|---|
| I-2.1 | `Tag.slug` 全表唯一 | DB unique index |
| I-2.2 | `Tag.aliases` 不包含当前 slug 自身 | 应用层校验（合并时） |
| I-2.3 | 一个 Tag 至少有一个 alias（即原始 slug 也在 aliases 中），便于外链命中 | 应用层构造 |

## I-3 Screenshot 相关

| ID | 不变量 | 检查层 |
|---|---|---|
| I-3.1 | 每个 Screenshot 必属某 Article | DB FK NOT NULL |
| I-3.2 | Screenshot 的 storage_key 在存储系统中实际存在 | 定时校验 job |
| I-3.3 | 同 Article 下 Screenshot.sort_order 唯一 | DB unique (article_id, sort_order) |
| I-3.4 | 删除 Article 时关联 Screenshot 不立即删除（30 天后随 Article 硬删） | cron job |

## I-4 导入

| ID | 不变量 | 检查层 |
|---|---|---|
| I-4.1 | ImportEvent.status=running 时同一 source 不应有第二个 running 实例 | 锁（CloudBase 函数互斥） |
| I-4.2 | ImportEvent 不可修改 counts / errors（不可变事件） | DB trigger 或应用层只 insert |
| I-4.3 | 一次导入失败不影响已有数据（仅记录 errors） | 事务边界 |

## I-5 跨域不变量

| ID | 不变量 | 检查层 |
|---|---|---|
| I-5.1 | MCP 永远不返回 draft / archived 状态的 Article | MCP server 层过滤 |
| I-5.2 | 写接口（import、tag 合并）只能从作者本地或 IP 白名单调用 | CloudBase 函数网络限制 |
| I-5.3 | 搜索结果中的 Article 必然是 published 状态 | 搜索查询 WHERE 子句 |

## I-6 Tag 合并 / 重命名 不变量

| ID | 不变量 | 检查层 |
|---|---|---|
| I-6.1 | 合并时，目标 Tag 不能在被合并的列表里 | 应用层校验 |
| I-6.2 | 合并完成后，被合并 Tag 在 ArticleTag 中出现次数 = 0 | DB 事务 |
| I-6.3 | 重命名后，旧 slug 进入 `aliases[]`，外部链接可继续命中 | 路由层 301 处理 |
| I-6.4 | 合并是事务性：要么全部完成，要么全部回滚 | 单一 DB 事务 |

## I-7 备份 / 恢复 不变量

| ID | 不变量 | 检查层 |
|---|---|---|
| I-7.1 | 最近 7 天内必须至少有一次成功备份 | 监控告警 |
| I-7.2 | 备份文件可在测试环境成功恢复 | 每月演练 |