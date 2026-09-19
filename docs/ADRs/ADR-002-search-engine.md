# ADR-002: 全文搜索方案

> 状态：✅ Accepted（2026-09-19）

## 背景
需要全文搜索，覆盖文章标题 / 正文 / tag。MVP 阶段 ≤ 1000 篇文章。

## 选项
- **A. Postgres FTS（推荐）**：内置；零额外组件；中文用 zhparser 或 simple 词典
- **B. Meilisearch**：更强（容错、faceting、拼音）；需独立部署或托管
- **C. Typesense**：类似 Meilisearch
- **D. SQLite FTS5**：不可行（已选 Postgres）

## 决策
**MVP 用 A. Postgres FTS**；性能不达标时升级到 B. Meilisearch。

理由：
1. MVP 文章量级 < 1000，FTS 足够
2. 零运维、零额外账号
3. 数据库升级路径清晰：相同 SQL 接口

## 后果
- ✅ 简单；查询 < 100ms 常见
- ⚠️ 中文分词效果取决于词典：先用 `simple`（按字），v1.1 评估 zhparser
- ⚠️ 模糊匹配 / 拼音搜索需 Meilisearch 才有

## 升级触发条件
- 文章数 > 5000
- 搜索 P95 > 500ms
- 用户要求拼音 / 模糊