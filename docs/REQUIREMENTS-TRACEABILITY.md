# Requirements Traceability — 微信 AI 使用技巧整理站

> Stage 02 交付物。FR ↔ Story ↔ Test ↔ Component 四列追踪。

## FR ↔ Story
| FR | 对应 US | 验收文档 |
|---|---|---|
| FR-1 内容管理 | US-1 | USER-STORIES.md §US-1 |
| FR-2 阅读浏览 | US-2 | USER-STORIES.md §US-2 |
| FR-3 搜索 | US-3 | USER-STORIES.md §US-3 |
| FR-4 标签系统 | US-4 | USER-STORIES.md §US-4 |
| FR-5 Cheat Sheet | US-5 | USER-STORIES.md §US-5 |
| FR-6 MCP 接入 | US-6 | USER-STORIES.md §US-6 |
| FR-7 部署运维 | US-7 | USER-STORIES.md §US-7 |

## Story ↔ Test
| Story | 测试方法 | 负责组件 |
|---|---|---|
| US-1 全量导入 | 集成测试（飞书 sandbox） | `tools/import-feishu.ts` |
| US-1 增量同步 | 集成测试 | `tools/import-feishu.ts` |
| US-2 详情页渲染 | E2E（Playwright）+ Lighthouse | `web/app/articles/[slug]/page.tsx` |
| US-3 搜索 | API 单元 + E2E | `web/app/api/search/route.ts` |
| US-4 tag CRUD/合并/重命名 | API 单元 + 集成 | `web/app/admin/tags/*` |
| US-5 PDF | E2E | `cloudfunction/cheatsheet-pdf/index.ts` |
| US-5 PNG | E2E | `cloudfunction/cheatsheet-png/index.ts` |
| US-6 MCP | MCP Inspector 手动 + 自动化 | `cloudfunction/mcp-server/index.ts` |
| US-7 周备 | 手动验证 + cron 日志 | `tools/backup-weekly.ts` |

## Story ↔ Component（粗粒度）
| 组件 | 承担的 Story |
|---|---|
| 前端 Next.js 应用 | US-2, US-3, US-4 (后台) |
| CloudBase 数据库 (Postgres) | US-1, US-2, US-3, US-4, US-6 |
| CloudBase 存储 | US-1, US-2, US-5 |
| CloudBase 函数 `import-feishu` | US-1 |
| CloudBase 函数 `cheatsheet-pdf` | US-5 (PDF) |
| CloudBase 函数 `cheatsheet-png` | US-5 (PNG) |
| CloudBase 函数 `mcp-server` | US-6 |
| CloudBase 函数 `backup-weekly` | US-7 |

## 优先级矩阵
| FR | 风险 | 业务价值 | MVP |
|---|---|---|---|
| FR-1 内容管理 | 中 | 高 | ✅ |
| FR-2 阅读浏览 | 低 | 高 | ✅ |
| FR-3 搜索 | 中 | 高 | ✅ |
| FR-4 标签系统 | 中 | 中 | ✅ |
| FR-5 Cheat Sheet | 高（puppeteer） | 中 | ✅ |
| FR-6 MCP 接入 | 中 | 中（差异化） | ✅ |
| FR-7 部署运维 | 低 | 高 | ✅ |

## 假设与依赖
- 飞书 API 稳定且限额允许
- CloudBase 免费层够用（U1 待核实）
- puppeteer 在 CloudBase 函数内可启动（U2 待核实）

## 风险与缓解（链接 assumptions.md）
- R1 飞书限流 → 退避重试
- R2 CloudBase 出口 → 走存储 + CDN
- R3 截图敏感 → SOP 打码
- R4 单点故障 → 周备月备
- R5 puppeteer 冷启动 → 预热 / 换 weasyprint
- R6 MCP 滥用 → 速率限制 + 仅摘要