# MVP Scope — 微信 AI 使用技巧整理站

> Stage 01 交付物。明确必须 / 可延后 / 不做。

## ✅ MVP 必须有（v1.0）
- **导入管线**：从飞书知识库 / 多维表格拉取文章与图片（一次性脚本 + 增量命令）
- **数据模型**：Article（含 Markdown 正文 + 截图引用）/ Tag / ArticleTag 关联 / Screenshot
- **公开阅读**：文章详情页、列表页、tag 页
- **全文搜索**：Postgres FTS（zhparser / simple 词典二选一），覆盖标题 + 正文 + tag
- **Tag 重建索引**：作者后台 CRUD tag、合并 tag、重建 ArticleTag 关联
- **Cheat Sheet**：
  - HTML / PDF（A4 可下载，puppeteer 渲染）
  - PNG 图卡片（1080×1440，水印）
- **MCP 接入**：暴露 `mcp.search_articles` / `mcp.get_article` / `mcp.list_tags` 给外部 Agent
- **部署**：公网静态前端 + CloudBase 后端函数 / 数据库 / 存储
- **备份**：每周 CloudBase 数据导出到对象存储

## 🟡 可延后（v1.1+）
- AI 自动建议 tag（LLM 提取）
- 全文搜索升级到 Meilisearch / Typesense
- 文章版本历史 / diff
- 简易统计（阅读量、热门 tag）
- RSS / 订阅
- 暗色模式 / 多语言

## ❌ 明确不做
- 多用户系统、登录、权限、评论
- 实时协作
- 自动抓取公众号 / 第三方网站
- 付费内容 / 会员系统

## 成功指标（Stage 01 暂定）
- 站点上线即可索引 ≥ 20 篇首发文章
- 全文搜索 P95 延迟 < 300ms
- Cheat Sheet 生成 < 10 秒 / 篇
- MCP 三个核心接口在 OpenAPI/MCP Inspector 调试通过
- 单人维护成本：每周 < 1 小时（含导入 + 校对）