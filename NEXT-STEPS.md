# NEXT-STEPS — 微信 AI 使用技巧整理站

> 这份文档只回答一个问题：**我现在该干什么？**
> 按时间窗口组织，每个窗口都有「做完后的样子」和「避坑提示」。
> 全程预计 12 个工作日（单人串行）。

---

## 🟢 5 分钟：把仓库立起来

```bash
cd C:\Users\leo\WorkBuddy\2026-09-19-11-06-46
git init
git add .
git commit -m "scaffold: agentic-web-dev stages 00-13 complete (39 docs + 12 configs)"
# 在 GitHub 创建空仓库 wx-ai-tips（不勾 README）
git remote add origin git@github.com:YOUR_NAME/wx-ai-tips.git
git branch -M main
git push -u origin main
```

**做完后的样子**：GitHub 仓库可见 39 份 docs + 12 份配置文件。

**避坑**：
- ❌ 不要把 `.env.local` 加进去（已在 .gitignore）
- ❌ 不要把 `backups/` 加进去
- ✅ 第一个 commit 之后再开 branch 做改动

---

## 🟡 1 小时：本地验证基础栈

```bash
# 1. 装 Node.js 20（已就绪：22.22.2-3）
node --version   # v22.x OK
pnpm --version   # 9.x；没有就 npm i -g pnpm@9

# 2. 安装依赖
pnpm install

# 3. 启动本地数据库
docker compose up -d
docker compose ps   # postgres + minio 都 healthy

# 4. 应用数据库迁移
pnpm db:migrate
# 检查：docker exec -it wx-ai-tips-pg psql -U app_user -d wx_ai_tips -c "\dt"
# 应该看到：articles / tags / article_tags / screenshots / import_events

# 5. 启动 Next.js
pnpm dev
# 打开 http://localhost:3000 —— 现在是空页面，正常
```

**做完后的样子**：
- `pnpm typecheck` 0 错误
- `pnpm lint` 0 错误（首次运行 ESLint 可能警告，可忽略）
- 5 张表已建好
- http://localhost:3000 返回 200

**避坑**：
- ❌ 不要在没装 docker 的情况下跑 `docker compose up` —— 跳到第 5 步只跑 Next.js
- ❌ 不要把 CloudBase 真实凭证填进 `.env.local` —— 留 `.env.example` 即可
- ❌ 不要 `git push` 真实 CloudBase 凭证

---

## 🔵 1 天：基础设施切片 S-0（任务 T-001 ~ T-006）

> 详见 `docs/IMPLEMENTATION-PLAN.md` §S-0

按顺序做：
1. **T-001** CloudBase 控制台创建 FREE 环境
2. **T-002** 开通 Postgres + 应用 `db/migrations/0001_init.sql`
3. **T-003** 创建存储桶 `wx-ai-tips`，开公开读
4. **T-004** GitHub 仓库 Secrets：CLOUDBASE_SECRET_ID / SECRET_KEY / ENV_ID
5. **T-005** 本地 docker 验证（已完成）
6. **T-006** CloudBase 控制台配环境变量（参考 `.env.example`）

**做完后的样子**：
- CloudBase 控制台能看到环境、Postgres 5 张表、存储桶
- GitHub Actions CI 第一次跑通（lint + typecheck + test + build）
- `.env.local` 真实凭证已配，pnpm dev 不报 CloudBase 错

**避坑**：
- ❌ **CloudBase 控制台访问需在国内网络**——如果你的环境在境外，先确认能访问 cloud.tencent.com
- ❌ 不要把 Secret 写到 `.env.local` 后又 commit
- ✅ 第一次配环境变量时，把 `APP_ENV` 留 `local`，避免误触发生产路径

---

## 🟣 1 周：核心垂直切片（S-1 + S-2 + S-5）

按依赖顺序：

### Week 1 Mon-Tue：S-1 数据导入（任务 T-101 ~ T-107）
- 写 `lib/adapters/lark-client.ts`（lark-cli 封装）
- 写 `cloudbase-functions/import-feishu/`（核心逻辑）
- 拉一篇测试飞书文档 → 验证 Article + Screenshot + Tag 入库
- 配 ISR revalidate 触发

### Week 1 Wed-Fri：S-2 阅读浏览（任务 T-201 ~ T-207）
- `app/page.tsx` 首页（精选 + 最新 + 热门 tag）
- `app/articles/page.tsx` 列表
- `app/articles/[slug]/page.tsx` 详情（Markdown 渲染）
- `app/tags/[slug]/page.tsx`
- ISR 60s/300s 配置
- SEO meta + sitemap

### Week 2 Mon-Wed：S-3 搜索（任务 T-301 ~ T-305）
- 验证 `search_tsv` 索引
- `app/api/search/route.ts`
- 搜索框组件
- 零结果处理

### Week 2 Thu-Fri：S-5 MCP（任务 T-501 ~ T-507）
- `cloudbase-functions/mcp-server/` 用 Streamable HTTP
- 三个 tool 实现
- Bearer Token 鉴权 + Origin 校验
- MCP Inspector 联通测试

**做完后的样子**：
- 浏览器能浏览文章 + 搜索
- MCP Inspector 能调 search_articles / get_article / list_tags

**避坑**：
- ❌ 不要跳过 ISR 配置（直接 SSR 会让 CloudBase 函数调用量爆炸）
- ❌ 不要在 MCP 里暴露写接口
- ❌ react-markdown 不要忘了 DOMPurify（XSS）
- ✅ 第一次跑 import：先在本地 Docker Postgres 测，再上 CloudBase

---

## 🟠 1 周：标签 + 备份 + 部署 + 验收（S-4 + S-6 + S-7 + S-8）

### Week 3 Mon-Wed：S-4 标签管理（任务 T-401 ~ T-407）
- `middleware.ts` IP 白名单
- `app/api/admin/tags/*` CRUD + merge
- 后台 UI `/admin/tags`
- Tag 频率云

### Week 3 Thu-Fri：S-6 备份（任务 T-601 ~ T-605）
- `cloudbase-functions/backup-weekly/`
- 周日 03:00 cron
- 第一次手动跑通 + 验证恢复

### Week 4 Mon-Tue：S-7 公网部署（任务 T-701 ~ T-705）
- 申请自定义域名（如需）+ 备案
- CloudBase 静态托管绑域名
- DNS 解析
- Lighthouse 性能审计

### Week 4 Wed-Fri：S-8 验收（任务 T-801 ~ T-807）
- G1-G7 发布门槛逐项过
- 写首次发布记录到 RETROSPECTIVE-TEMPLATE.md

---

## ⚫ 长期：每季度一次回顾

- 季度初跑 `docs/RETROSPECTIVE-TEMPLATE.md`
- 看 `docs/DEPENDENCY-REVIEW.md` 跑 `pnpm outdated`
- 看 `docs/TECH-DEBT.md` 排下一轮
- 每季度做一次备份恢复演练（BACKUP-RESTORE.md §3）

---

## 🆘 卡住了怎么办

| 症状 | 看哪份文档 |
|---|---|
| 不知道做什么 | IMPLEMENTATION-PLAN.md §S-X |
| 写代码卡住 | IMPLEMENTATION-GUIDE.md §3-7 |
| 部署失败 | RELEASE-CHECKLIST.md §3 |
| 5xx 报警 | OPERATIONS-RUNBOOK.md §5 |
| MCP 不通 | MCP-CONTRACT.md §7 |
| 设计问题 | 回到对应阶段文档（00-13） |
| 不确定业务规则 | DOMAIN-INVARIANTS.md |

---

## 🎯 第一个 PR 的最小目标

> 「**能跑通 hello world + 一篇测试文章**」

```bash
git checkout -b feat/scaffold-hello
# 在 app/page.tsx 写：
#   export default function Page() {
#     return <main><h1>微信 AI 技巧站</h1></main>
#   }
pnpm dev  # 浏览器看 http://localhost:3000 出现「微信 AI 技巧站」
pnpm lint && pnpm typecheck
git add . && git commit -m "feat: hello world scaffold"
git push origin feat/scaffold-hello
# 在 GitHub 开 PR → 自己 review → merge
```

完成后告诉我「第一个 PR 合并了」，我们继续做 S-0 基础设施。

---

_这份文档由 WorkBuddy / agentic-web-dev 技能于 2026-09-19 生成，作为整套 39 份设计 + 12 份配置产物的入口指引。_