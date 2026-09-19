# RELEASE-CHECKLIST — 微信 AI 使用技巧整理站

> Stage 11 交付物。生产发布检查清单（每次发布都跑一遍）。

## 1. 发布前 24 小时

- [ ] 所有 PR 合并到 main
- [ ] CI 全绿（lint / typecheck / test / build / e2e）
- [ ] 集成测试通过（SC-1 ~ SC-5）
- [ ] 性能测试达到 NFR 目标（k6）
- [ ] 安全扫描 0 高危（pnpm audit / Semgrep / gitleaks）
- [ ] 数据库迁移脚本已审核、可重放
- [ ] 备份 cron 已运行至少一次成功
- [ ] 监控告警已配置（5xx / 用量 / MCP 失败率）
- [ ] README / 文档已同步更新

## 2. 发布前 1 小时

- [ ] GitHub Actions deploy workflow 准备就绪
- [ ] production environment 需要 reviewer approval（GitHub 设置）
- [ ] 在 PR 中标记 `release: vX.Y.Z`
- [ ] 通知作者本人（避免假期发布）
- [ ] 准备回滚命令（见 ROLLBACK.md）

## 3. 发布中（按顺序）

1. **触发 deploy**（GitHub Actions → production）
2. **等待** workflow 完成（~5-10 分钟）
3. **健康检查**：
   ```bash
   curl -fsS https://wx-ai-tips.example.com/api/articles?pageSize=1 | jq .
   ```
4. **关键旅程 smoke test**：
   - [ ] 首页可访问
   - [ ] 文章详情可访问
   - [ ] 搜索可用
   - [ ] MCP search_articles 联通
5. **日志检查**：
   - [ ] 5xx 错误率 < 1%
   - [ ] CloudBase 函数无 OOM
6. **数据库检查**：
   - [ ] 迁移应用成功（查询版本）
   - [ ] ISR revalidate 命中

## 4. 发布后 24 小时

- [ ] 监控大盘正常（CloudBase 控制台）
- [ ] 无未处理告警
- [ ] 用户反馈（如已开放）
- [ ] 用量未暴增
- [ ] 备份 cron 下次触发前确认上次备份完整

## 5. 发布记录模板

```markdown
## Release vX.Y.Z — YYYY-MM-DD

### 变更
- feat: ...
- fix: ...
- perf: ...
- docs: ...

### 数据库迁移
- 0002_add_xxx.sql

### 风险
- ...

### 验证
- CI: ✅
- 集成测试: ✅
- 性能: 列表 P95=Xms
- Smoke test: ✅

### 监控
- 错误率: 0.X%
- 用量: X / 3000 资源点

### 后续行动
- ...
```

## 6. 发布负责人

- 主发布：作者本人
- 紧急回滚：作者本人 + GitHub environment protection
- 备份值班：作者本人（无轮班）

## 7. 禁止事项

- ❌ 未经本人批准发布
- ❌ 周五下午发布（避免周末值班）
- ❌ 节假日发布
- ❌ 数据库破坏性迁移未单独演练
- ❌ 启用计费 / 升级套餐未经批准