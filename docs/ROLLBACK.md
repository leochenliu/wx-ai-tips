# ROLLBACK — 微信 AI 使用技巧整理站

> Stage 11 交付物。回滚步骤与触发条件。

## 1. 何时回滚

发布后**立即**回滚的情况：
- 5xx 错误率 > 5%（持续 5 分钟）
- 关键旅程失败（首页 / 详情 / 搜索 / MCP）
- 数据库迁移失败或数据损坏
- 安全漏洞被发现
- 用量异常暴增（> 50% 月预算）

发布后**观察**再决定的情况：
- 性能略低于预期（>10% 退化）
- 单个非关键功能异常
- UI 样式问题

## 2. 回滚策略选择

| 回滚深度 | 适用 | 操作 |
|---|---|---|
| **代码回滚** | 代码层 bug | `git revert` + 重新部署 |
| **配置回滚** | 环境变量错误 | CloudBase 控制台改 env + 重新部署 |
| **数据回滚** | DB 迁移失败 | 还原上次备份 |
| **完全回滚** | 系统级故障 | 切回上一个 working release |

## 3. 代码回滚步骤（最常见）

```bash
# 1. 找到上一个 working release 的 commit SHA
git log --oneline -20 production

# 2. 本地回滚
git checkout main
git revert <bad-commit-sha>
git push origin main

# 3. 触发 deploy workflow（手动 rerun）
# GitHub → Actions → deploy → Run workflow

# 4. 验证
curl -fsS https://wx-ai-tips.example.com/api/articles?pageSize=1 | jq .

# 5. 监控 30 分钟
```

## 4. 数据回滚步骤（DB 迁移失败时）

```bash
# 1. 立即停止 CloudBase 静态托管（防止新请求进入坏数据）
# CloudBase 控制台 → 静态托管 → 暂停

# 2. 下载最近一次备份（如果还没被覆盖）
# 从 backups/ 存储目录拉 db-YYYY-MM-DD.sql.gz

# 3. 在临时 Postgres 恢复
gunzip < db-2026-09-19.sql.gz | psql "$PGHOST_TEST" -U app_user -d postgres

# 4. 验证数据完整性
psql "$PGHOST_TEST" -U app_user -d postgres -c "
  SELECT COUNT(*) FROM articles WHERE status='published';
  SELECT COUNT(*) FROM article_tags;
"

# 5. 切流量到恢复后的 DB（修改环境变量 + 重启函数）

# 6. 重新开放 CloudBase 静态托管
```

## 5. 配置回滚步骤

```bash
# CloudBase 控制台 → 环境 → 环境变量
# 改错的变量 → 触发函数热更新（无需重新部署）
```

## 6. CDN / 缓存清理

```bash
# Next.js ISR 失效
curl -X POST https://wx-ai-tips.example.com/api/admin/revalidate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paths": ["/articles", "/tags"]}'
```

## 7. 通信

回滚期间：
- 在 PR 评论记录回滚原因 + 时间
- 在 RETROSPECTIVE.md 中追加事故记录
- 如用户受影响，在站点首页加 banner

## 8. 回滚后行动

- [ ] 恢复公开访问
- [ ] 跑集成测试确认无回归
- [ ] 写事故复盘（INCIDENT-XXX）
- [ ] 改进：增加缺失的测试 / 监控
- [ ] 通知所有相关方

## 9. 演练

每季度做一次回滚演练（不实际回滚，只走流程 + 验证备份可恢复）：
- 周日 03:00 周备后
- 拉最新备份到本地
- 走 1-7 步骤（最后一步不切流量）