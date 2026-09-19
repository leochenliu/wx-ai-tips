# TECH-DEBT — 微信 AI 使用技巧整理站

> Stage 13 交付物。技术债登记。

## 1. 债项登记

| ID | 描述 | 严重 | 估时 | 责任人 | 创建日 | 状态 |
|---|---|---|---|---|---|---|
| DEBT-001 | Cheat Sheet（PDF + PNG）功能未实现，v1.0 推迟到 v1.1 + CloudRun | 中 | 3d | 作者 | 2026-09-19 | open |
| DEBT-002 | Postgres FTS 使用 simple 词典，中文分词效果有限 | 低 | 0.5d（评估 zhparser）| 作者 | 2026-09-19 | open |
| DEBT-003 | 无自动 LLM 建议 tag（v1.1）| 低 | 1d | 作者 | 2026-09-19 | open |
| DEBT-004 | 无暗色模式（v1.1）| 低 | 1d | 作者 | 2026-09-19 | open |
| DEBT-005 | 无 RSS / 订阅 | 低 | 0.5d | 作者 | 2026-09-19 | open |
| DEBT-006 | RLS 未启用（v1.1 加）| 低 | 0.5d | 作者 | 2026-09-19 | open |
| DEBT-007 | 数据库 schema migration 缺 pg 客户端工具链 | 低 | 0.5d | 作者 | 2026-09-19 | open |
| DEBT-008 | lark-* 飞书导入脚本暂未实现（设计完成，实施待办）| 中 | 2d | 作者 | 2026-09-19 | open |

## 2. 债项描述

### DEBT-001：Cheat Sheet 推迟
- **原因**：CloudBase FREE 层函数超时 3s + 内存 256MB，无法跑 puppeteer
- **影响**：用户不能下载 Cheat Sheet
- **升级路径**：v1.1 启用 CloudRun 容器模式 + puppeteer
- **追踪**：ADR-004

### DEBT-002：FTS 中文分词
- **原因**：Postgres simple 词典按字分词，「微信支付」会被切成「微」「信」「支」「付」
- **影响**：搜索精度下降，但 MVP 量级 < 1000 篇可接受
- **升级路径**：评估 zhparser 或切换 Meilisearch

### DEBT-008：飞书导入脚本未实施
- **原因**：本会话仅完成设计 + 任务清单，未实际写 import-feishu 函数
- **影响**：用户手动整理的内容无法自动入库
- **下一步**：本地 scaffold Next.js 后按 IMPLEMENTATION-PLAN §S-1 实施

## 3. 偿还计划

按优先级：
1. **P1**：DEBT-008（阻塞核心流程）
2. **P2**：DEBT-002、DEBT-006
3. **P3**：DEBT-001（v1.1）、DEBT-003 / 004 / 005（v1.1+）

## 4. 新增债的流程

发现新债时：
1. 加一行到 §1
2. 写明触发原因 / 影响 / 升级路径
3. 评估严重：阻塞 / 高 / 中 / 低
4. 排入下一轮 IMPLEMENTATION-PLAN 或 v1.x 路线图