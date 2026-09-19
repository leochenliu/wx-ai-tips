# BACKUP-RESTORE — 微信 AI 使用技巧整理站

> Stage 12 交付物。备份与恢复策略。

## 1. 备份策略

### 1.1 周备
- **触发**：每周日 03:00（cron）
- **内容**：
  - `pg_dump` 整个数据库 → `backups/db-YYYY-MM-DD.sql.gz`
  - 存储对象清单快照 → `backups/objects-YYYY-MM-DD.json`
  - 函数列表 + 配置 → `backups/functions-YYYY-MM-DD.json`
- **保留**：8 周（自动滚动删除）
- **存放**：`CLOUDBASE_STORAGE/wx-ai-tips/backups/`

### 1.2 月备
- **触发**：每月 1 日 04:00
- **内容**：同周备 + 导出到 GitHub Releases（vX.Y.Z tag）作为异地备份
- **保留**：12 个月

### 1.3 临时备份
- **触发**：发布前（人工）
- **操作**：`pnpm backup:now`
- **保留**：永久（手动清理）

## 2. 备份内容详解

### 2.1 数据库导出
```bash
pg_dump \
  --host="$PGHOST" \
  --port=5432 \
  --username=app_user \
  --dbname=postgres \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  > db-YYYY-MM-DD.dump

# 压缩 + 上传
gzip db-YYYY-MM-DD.dump
tcb storage upload backups/db-YYYY-MM-DD.dump.gz
```

### 2.2 存储对象清单
```typescript
// 由 backup 函数生成
interface ObjectSnapshot {
  key: string;
  size: number;
  lastModified: string;
  etag: string;
}
```

### 2.3 函数配置
```typescript
interface FunctionSnapshot {
  name: string;
  runtime: string;
  memoryMB: number;
  timeoutSec: number;
  envVars: Record<string, string>;  // 不含 secret 值
  triggers: Trigger[];
}
```

## 3. 备份验证（每月）

### 3.1 自动化
- backup 函数完成后自动跑 `pg_restore --list` 验证备份文件可解析
- 结果写入 backup log

### 3.2 手动（每月 1 次）
```bash
# 1. 拉最新备份
tcb storage download backups/db-YYYY-MM-DD.dump.gz

# 2. 在本地 Docker Postgres 恢复
docker compose up -d postgres
gunzip < db-YYYY-MM-DD.dump.gz | \
  psql "postgresql://app_user:local_dev_password@localhost:5432/wx_ai_tips"

# 3. 验证数据
psql "postgresql://app_user:local_dev_password@localhost:5432/wx_ai_tips" <<EOF
SELECT
  (SELECT COUNT(*) FROM articles WHERE status='published') AS published_articles,
  (SELECT COUNT(*) FROM tags) AS tags,
  (SELECT COUNT(*) FROM screenshots) AS screenshots,
  (SELECT MAX(published_at) FROM articles) AS latest_article;
EOF

# 4. 对比 CloudBase 生产数据
# 5. 记录到本文件 §5
```

## 4. 恢复流程

### 4.1 全量恢复（灾难场景）
```bash
# 1. 暂停 CloudBase 静态托管
# 控制台 → 静态托管 → 暂停

# 2. 在临时 PG 实例恢复
gunzip < db-YYYY-MM-DD.dump.gz | \
  psql "$NEW_PG_INSTANCE_URL"

# 3. 验证数据完整性（同 §3.2）

# 4. 切换环境变量指向新 PG
# 触发函数热更新

# 5. 重新开放 CloudBase 静态托管
```

### 4.2 部分恢复（删错数据）
```bash
# 1. 从备份拉取
tcb storage download backups/db-YYYY-MM-DD.dump.gz

# 2. 解压到临时 DB
gunzip < db-YYYY-MM-DD.dump.gz | \
  pg_restore --dbname=postgres_recovery --create --clean

# 3. 用 SQL 提取特定数据
pg_dump --data-only --table=articles postgres_recovery \
  | psql "$PROD_PG_INSTANCE_URL"

# 4. 触发 ISR revalidate
```

### 4.3 存储对象恢复
```bash
# 1. 从对象清单找到 storage_key
# 2. 如存储桶已删除，从 GitHub Releases 拉月备归档
# 3. 重新上传到存储桶
```

## 5. 演练记录

| 日期 | 操作 | 结果 | 操作人 |
|---|---|---|---|
| | | | |

## 6. RTO / RPO 目标

| 项 | 目标 |
|---|---|
| RPO（数据丢失容忍）| ≤ 7 天（周备间隔） |
| RTO（恢复时间目标）| ≤ 4 小时 |

## 7. 备份失败响应

参见 ALERTS.md §2.1 ALERT-P0-003。

## 8. 异地备份

- GitHub Releases 作为异地备份
- 每月 1 日自动上传
- 保留 12 个月

## 9. 备份安全

- 备份文件含数据库完整数据 → 视为敏感
- 仅作者本人有 CloudBase 凭证 + GitHub 权限
- 备份**不**含 API Key / Token / 用户数据（无用户系统）