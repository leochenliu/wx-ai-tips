# 微信 AI 使用技巧整理站

> 公网可访问的「微信 AI 使用技巧」单一事实来源。
> 从飞书导入、CloudBase 托管、MCP 暴露给外部 Agent。

## 功能
- 📖 文章：文字 + 截图混排，从飞书知识库导入
- 🔍 全文搜索：覆盖标题 / 正文 / tag
- 🏷️ 标签系统：CRUD + 合并 + 重命名（保留 alias）
- 📄 Cheat Sheet：v1.0 推迟到 v1.1
- 🤖 MCP 接入：暴露给外部 LLM Agent

## 快速开始（本地）

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填写 CloudBase / 飞书凭证

# 3. 启动本地数据库（可选；也可直接连 CloudBase 远程）
docker compose up -d

# 4. 应用迁移
pnpm db:migrate

# 5. 启动开发服务器
pnpm dev
```

打开 http://localhost:3000

## 文档

设计文档在 `docs/` 目录，按 agentic-web-dev 技能 13 个阶段组织：

| 阶段 | 文档 |
|---|---|
| 00 Intake | `PROJECT-INTAKE.md` |
| 01 Discovery | `problem-statement.md` / `user-personas.md` / `user-journeys.md` / `mvp-scope.md` / `assumptions.md` |
| 02 Spec | `PRD.md` / `USER-STORIES.md` / `ACCEPTANCE-CRITERIA.md` / `REQUIREMENTS-TRACEABILITY.md` |
| 03 Domain | `DOMAIN-MODEL.md` / `GLOSSARY.md` / `DOMAIN-INVARIANTS.md` / `STATE-MACHINES.md` |
| 04 Arch | `ARCHITECTURE.md` / `CONTEXT-DIAGRAM.md` / `ADRs/*` / `ENVIRONMENTS.md` |
| 04a Infra | `INFRASTRUCTURE-PLAN.md` / `COST-REGISTER.md` / `VENDOR-LOCK-IN-REVIEW.md` / `INFRASTRUCTURE-RISKS.md` |
| 05 Contracts | `openapi.yaml` / `API-ERRORS.md` / `MCP-CONTRACT.md` / `schemas/*` / `events/*` |

## 部署

- **预览**：PR merge 前自动部署到 CloudBase 预览环境
- **生产**：merge 到 `main` 后由 GitHub Actions 自动部署（需手动确认）

详见 `docs/ENVIRONMENTS.md`

## 安全

发现安全问题请直接联系作者（不放邮箱）。已实施：
- 后台接口 IP 白名单
- MCP Bearer Token 鉴权
- Origin 头校验
- 公开接口 100 RPM 限速
- 截图 PII 标记

## License

私有项目