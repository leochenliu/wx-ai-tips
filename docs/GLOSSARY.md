# Glossary — 微信 AI 使用技巧整理站

> Stage 03 交付物。统一业务词汇表，避免歧义。

## A
- **Article（文章）**：站点内一篇微信 AI 使用技巧的内容单元
- **AI 专属卡**：微信支付推出的 AI 智能体支付卡片能力
- **Aliases（标签别名）**：Tag 被重命名后保留的历史 slug，外部链接可继续命中

## B
- **Backup（备份）**：定期导出数据库 / 存储对象到归档位置

## C
- **Cheat Sheet（速查表）**：从文章派生的可下载单页产物（PDF / PNG）
- **CloudBase（腾讯云开发）**：本项目的后端 BaaS（数据库 / 存储 / 函数 / MCP）

## D
- **Domain Event（领域事件）**：业务中已发生事实的不可变记录（例：ImportEvent）
- **Draft（草稿）**：Article 状态之一，未对外可见

## F
- **Feishu（飞书）**：本项目的内容来源（知识库 / 多维表格）

## I
- **ImportEvent（导入事件）**：一次导入操作的领域事件，记录输入输出与错误
- **Invariant（不变量）**：领域模型必须始终成立的约束条件

## M
- **MCP（Model Context Protocol）**：让外部 LLM Agent 调用本站点能力的协议
- **Markdown**：本项目文章正文的存储格式

## P
- **Published（已发布）**：Article 状态之一，对外可见
- **Puppeteer**：生成 PDF / PNG 的浏览器渲染工具（也可用 Playwright）

## R
- **Recycle Bin（回收站）**：软删 Article 的暂存区；30 天后硬删

## S
- **Screenshot（截图）**：图片资产；属某 Article
- **Slug**：URL 友好的标识符
- **Soft Delete（软删）**：标记 archived，不真正删除，30 天回收
- **Source of Truth（真源）**：业务数据的唯一权威来源（这里是 Postgres）

## T
- **Tag（标签）**：文章的多对多分类
- **TOC（目录）**：侧边栏展示，可由 Tag + 文章导航组成

## U
- **Upsert（幂等写入）**：按 slug 存在则更新，否则插入；增量同步基础

## V
- **Value Object（值对象）**：无身份的对象，由其值定义（Slug、Markdown）

## 不属于词汇表（避免污染）
- 不要把「飞书 docx 节点」「Postgres 表」「CloudBase 存储 key」当作业务术语——它们是技术映射
- 不要把前端组件（Card、Button）当作领域概念