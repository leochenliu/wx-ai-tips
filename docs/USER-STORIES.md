# User Stories + Acceptance Criteria — 微信 AI 使用技巧整理站

> Stage 02 交付物。每条故事用 Given/When/Then 描述验收条件。

## US-1 导入文章
**As** 作者  
**I want** 把飞书知识库中的文章导入站点  
**So that** 我不需要二次录入

```gherkin
Scenario: 全量导入首次成功
  Given 飞书应用有 wiki.read / docx.document:readonly 权限
  And 数据库为空
  When 运行 `npm run import:all`
  Then 数据库新增 N 条 Article 记录（N = 飞书目标文档数）
  And 每篇文章至少有 1 张截图被上传到 CloudBase 存储
  And 导入完成后控制台输出统计报告

Scenario: 增量同步幂等
  Given 数据库已有 10 篇文章
  When 运行 `npm run import:incremental`
  Then 数据库新增或更新的文章数 = 飞书端变化的文章数
  And 已存在的文章 slug 不变（避免外链失效）
```

## US-2 阅读文章
**As** 读者  
**I want** 在浏览器看一篇文章 + 截图  
**So that** 我能学到具体怎么操作

```gherkin
Scenario: 详情页正常渲染
  Given 一篇已发布的文章（含 5 张截图）
  When 访问 `/articles/<slug>`
  Then 页面在 1.5s 内首屏完成
  And Markdown 正确渲染（包括代码块、表格、列表）
  And 截图懒加载可见时正常显示
  And SEO meta 完整（title / description / og:image）

Scenario: 文章被软删
  Given 文章 A 在 30 天前被软删
  When 访问 `/articles/<A.slug>`
  Then 返回 410 Gone + 友好提示
```

## US-3 全文搜索
**As** 读者  
**I want** 搜索关键词  
**So that** 我能快速找到相关文章

```gherkin
Scenario: 关键词命中
  Given 数据库有 50 篇含"微信支付"关键词的文章
  When 在搜索框输入 "微信支付 AI 专属卡" 并回车
  Then 返回 ≤ 20 条结果，按相关度排序
  And 每条结果显示：标题、摘要 100 字、tag、更新时间
  And P95 < 300ms

Scenario: 零结果
  Given 关键词 "xzyxyz123" 不存在
  When 搜索
  Then 返回空结果 + 友好提示「没找到相关文章，换个词试试？」
```

## US-4 Tag 索引重建
**As** 作者  
**I want** 合并 / 重命名 tag  
**So that** 标签体系保持清晰

```gherkin
Scenario: 合并 tag
  Given tag X、Y、Z 各被 5 篇文章使用
  When 作者在后台选择 "合并 X、Y、Z → Z'"
  Then ArticleTag 表中所有 X、Y 的关联改为 Z'
  And ArticleTag 表中 X、Y 行被删除
  And 操作在 1s 内完成（数据库事务）

Scenario: 重命名 tag 且保留别名
  Given tag W 被 20 篇文章引用
  And 外部有链接 `/tags/w`
  When 作者把 W 重命名为 W'
  Then ArticleTag 表更新为 W'
  And `/tags/w` 301 跳转 `/tags/w'`
```

## US-5 Cheat Sheet 生成
**As** 读者  
**I want** 把一篇文章转成 PDF / 图卡片  
**So that** 我能离线/分享

```gherkin
Scenario: PDF 生成成功
  Given 文章 A 含 2000 字正文 + 5 张截图
  When 点击 "导出 PDF"
  Then 在 10s 内下载到 A4 PDF
  And PDF 含完整正文、截图、页码、站点水印

Scenario: PNG 图卡片生成成功
  Given 同上
  When 点击 "生成图卡片"
  Then 在 10s 内下载到 1080×1440 PNG
  And PNG 含标题、摘要 200 字、前 3 个关键步骤、底部水印
```

## US-6 MCP 检索
**As** 外部 Agent  
**I want** 通过 MCP 调用搜索 / 获取文章  
**So that** 我的 LLM 应用能引用站点内容

```gherkin
Scenario: MCP 搜索调用
  Given MCP server 已注册
  When 调用 `mcp.search_articles({query: "微信支付 AI 专属卡 开通", limit: 5})`
  Then 返回 ≤ 5 条命中
  And 每条含 id / title / summary / url / tags
  And 调用耗时 P95 < 500ms

Scenario: MCP 获取详情
  When 调用 `mcp.get_article({id: "abc123"})`
  Then 返回完整正文（Markdown）+ 截图 URL 数组
  And 不返回草稿 / 已删除文章
```

## US-7 备份与恢复
**As** 作者  
**I want** 每周自动备份  
**So that** 数据可恢复

```gherkin
Scenario: 周备成功
  Given cron 已配置
  When 周日 03:00 触发
  Then 数据库导出到对象存储 `backup/db-YYYY-MM-DD.sql.gz`
  And 截图存储做增量备份
  And 备份报告写入 `backup/log/YYYY-MM-DD.log`
```