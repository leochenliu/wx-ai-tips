# VENDOR-LOCK-IN-REVIEW — 微信 AI 使用技巧整理站

> Stage 04a 交付物。供应商锁定风险与迁移路径。

## 1. 锁定点清单

| 锁定点 | 风险等级 | 迁移成本 |
|---|---|---|
| CloudBase Postgres API（兼容 Supabase） | **中** | 低：Supabase/Neon/RDS 都支持 PG；@cloudbase/js-sdk 可换 pg 直连 |
| CloudBase 函数运行时 | 中 | 中：迁移到 Cloudflare Workers / Vercel Functions 需改少量胶水代码 |
| CloudBase 存储 | 中 | 中：迁移到 R2 / S3 改文件路径生成策略 |
| CloudBase 静态托管 | 低 | 低：Next.js 产物可部署到任意 CDN |
| 飞书 API（数据源） | 中 | 中：换 Notion / Notion API 需重写导入脚本 |
| lark-cli | 低 | 低：可换 HTTP API 或其它封装 |

## 2. 各供应商详细评估

### 2.1 CloudBase
- **锁定形式**：
  - 数据库：Postgres 协议 + RLS，但鉴权机制 `auth.uid()` 是 CloudBase/Supabase 风格
  - 函数：CloudBase 函数 SDK（@cloudbase/node-sdk），但 HTTP 触发可走标准 JSON
  - 存储：上传 API 是 CloudBase 特有；下载 URL 格式与 S3 不通用
- **可迁移性**：
  - 数据库：`pg_dump` 全量 → 新实例即可；RLS 策略是标准 SQL
  - 函数：业务代码是 TypeScript，迁移到 Workers/Vercel 主要改 runtime 适配
  - 存储：URL 重写规则透明
- **缓解策略**：
  - 所有数据库访问走 `pg` 直连，不绑 CloudBase SDK
  - 存储 URL 在数据层以 `storage_key` 形式保存，URL 解析放在基础设施层（防腐蚀层）
  - 业务函数只用标准 Node.js API，不依赖 CloudBase 私有 SDK

### 2.2 飞书
- **锁定形式**：
  - 内容源在飞书知识库 / 多维表格
  - 字段语义（标题、正文、图片）需要在导入时映射
- **可迁移性**：
  - 重新导入一次即可（数据已沉淀到 Postgres）
  - 飞书端内容仍可访问，仅不再作为真源
- **缓解策略**：
  - 在 `articles.source_url` 保留飞书原文链接
  - 保留 `import_events` 审计轨迹

### 2.3 MCP 协议
- **锁定形式**：无（标准协议）
- **可迁移性**：零
- **缓解**：不适用

## 3. 防腐蚀层（Anti-Corruption Layer）设计

```
领域 (Domain)
   │
   ▼
Repository 接口（标准接口）
   │
   ▼
Adapter：PostgresAdapter / S3Adapter / LarkAdapter
   │
   ▼
外部系统（CloudBase / 飞书 / MCP）
```

业务代码只依赖 Repository 接口；Adapter 层封装所有第三方细节。
这意味着：
- 换 CloudBase → Neon：只改 PostgresAdapter
- 换飞书 → Notion：只改 LarkAdapter
- 换 CloudBase 存储 → R2：只改 S3Adapter

## 4. 数据可移植性测试（每季度）

每季度做一次"导出-恢复"演练：
1. `pg_dump` 完整数据库
2. 上传所有存储对象到本地
3. 在本地 Docker Postgres 恢复
4. 在本地 MinIO 恢复对象
5. 修改 Adapter 指向本地
6. 验证核心流程（读 / 搜索 / MCP）

如果某一步失败 ≥ 30 分钟，记录并修复 Adapter 抽象漏洞。

## 5. 关键不变量（来自 DOMAIN-INVARIANTS）
- I-7.1 最近 7 天内必须至少有一次成功备份
- I-7.2 备份文件可在测试环境成功恢复

## 6. 替代供应商候选

| 维度 | 当前 | 候选 | 切换难度 |
|---|---|---|---|
| 数据库 | CloudBase PG | Neon / Supabase / RDS | 低（标准 PG） |
| 函数 | CloudBase 函数 | Cloudflare Workers / Vercel | 中（胶水代码） |
| 存储 | CloudBase 存储 | R2 / S3 / 七牛 | 中（URL 格式） |
| 静态托管 | CloudBase | Cloudflare Pages / Vercel | 低 |
| 数据源 | 飞书 | Notion / 印象笔记 | 中（导入脚本） |