# DEPENDENCY-REVIEW — 微信 AI 使用技巧整理站

> Stage 13 交付物。依赖审视（每季度 + 大版本更新前）。

## 1. 核心依赖清单

| 依赖 | 当前版本 | 用途 | 更新风险 |
|---|---|---|---|
| next | ^15.1.0 | 前端框架 | 高（major） |
| react | ^19.0.0 | UI 库 | 中 |
| @cloudbase/js-sdk | ^2.5.0 | BaaS SDK | 中 |
| @modelcontextprotocol/sdk | ^1.0.0 | MCP | 中 |
| pg | ^8.13.0 | Postgres 客户端 | 低 |
| react-markdown | ^9.0.0 | Markdown 渲染 | 中（XSS 风险）|
| zod | ^3.23.0 | 运行时校验 | 低 |
| tailwindcss | ^3.4.0 | CSS 框架 | 低 |

## 2. 季度审视清单

每季度（季度初）：
- [ ] 跑 `pnpm outdated` 看过期依赖
- [ ] 检查 Dependabot PR
- [ ] 检查主要依赖的 release notes（next / cloudbase / mcp sdk）
- [ ] 检查 CloudBase 价格 / 政策变化
- [ ] 检查 Postgres 新版本（major 升级窗口）
- [ ] 检查 Node.js LTS 变化

## 3. 更新策略

| 类型 | 策略 |
|---|---|
| Patch | 随时更新；CI 跑过即合并 |
| Minor | 周更窗口合并；先在预览环境验证 |
| Major | 单独评估 + spike；不在忙季升级 |

## 4. 安全监控

- Dependabot 自动提 PR（含 security 标签）
- `pnpm audit` 在 CI 中跑；高危阻止合并
- 关注 Snyk / GitHub Security Advisories

## 5. 重大升级日志

| 日期 | 依赖 | from → to | 原因 | 后果 |
|---|---|---|---|---|
| | | | | |

## 6. 弃用风险

| 依赖 | 弃用风险 | 替代方案 |
|---|---|---|
| @cloudbase/js-sdk | 低（持续维护）| 标准 pg 直连（已使用） |
| @modelcontextprotocol/sdk | 中（协议演进中）| 跟随官方升级 |
| next | 低 | 重写成本高；跟随官方升级 |

## 7. 锁定重新评估

每季度检查：
- 是否出现更好的 BaaS（Neon / Supabase）
- CloudBase 价格 / 限额是否变化
- MCP 协议是否引入破坏性变更
- Next.js 是否被新框架取代（如 Astro / Remix）

评估结果写入 RETROSPECTIVE.md。

## 8. 自动化

`.github/dependabot.yml`（建议）：

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    groups:
      patch-and-minor:
        update-types: ["minor", "patch"]
      major:
        update-types: ["major"]
```