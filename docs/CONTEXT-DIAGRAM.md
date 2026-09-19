# Context Diagram — 微信 AI 使用技巧整理站

> Stage 04 交付物。C4 风格的系统上下文 + 容器图。

## Level 1 — System Context

```mermaid
flowchart LR
    Reader[读者<br/>浏览器用户]
    Agent[外部 Agent<br/>MCP 客户端]
    Author[作者<br/>本地管理员]
    Lark[飞书<br/>知识库 / 多维表格]

    subgraph Site[微信 AI 使用技巧整理站]
        System[站点系统]
    end

    Reader -->|HTTPS 浏览 / 搜索 / 下载| System
    Agent -->|MCP 搜索 / 详情| System
    Author -->|本地命令 / 后台按钮<br/>导入 / tag 管理| System
    System -->|lark-cli 拉文档 / 图片| Lark
```

## Level 2 — Container

```mermaid
flowchart TB
    subgraph Web[Web 前端 CloudBase 托管]
        Next[Next.js App<br/>SSR + ISR + API Routes]
    end

    subgraph Fn[CloudBase 函数层]
        Import[import-feishu<br/>导入飞书]
        Pdf[cheatsheet-pdf<br/>PDF 渲染]
        Png[cheatsheet-png<br/>PNG 渲染]
        Mcp[mcp-server<br/>MCP 接口]
        Backup[backup-weekly<br/>备份 cron]
    end

    subgraph Data[数据层]
        DB[(CloudBase Postgres)]
        Store[(CloudBase 存储)]
    end

    Reader -->|HTTPS| Next
    Agent -->|MCP over stdio/SSE| Mcp
    Author -->|HTTPS / CLI| Next
    Author -->|HTTPS| Import

    Next -->|SQL 查询| DB
    Next -->|URL 引用| Store

    Import -->|拉文档| LarkAPI[飞书 API]
    Import -->|upsert| DB
    Import -->|上传图片| Store

    Pdf -->|读 Article / Screenshot| DB
    Pdf -->|上传 PDF| Store
    Png -->|读 Article / Screenshot| DB
    Png -->|上传 PNG| Store

    Mcp -->|FTS 查询| DB

    Backup -->|export SQL| Store
    Backup -->|pg_dump| DB
```

## 容器清单

| 容器 | 技术 | 职责 |
|---|---|---|
| Next.js App | Next.js 15 App Router | 读者浏览、搜索、作者后台 |
| import-feishu | CloudBase 函数 + TypeScript | 飞书导入 |
| cheatsheet-pdf | CloudBase 函数 + puppeteer | PDF 渲染 |
| cheatsheet-png | CloudBase 函数 + puppeteer | PNG 渲染 |
| mcp-server | CloudBase 函数 + MCP SDK | MCP 接口 |
| backup-weekly | CloudBase cron 函数 | 备份 |
| CloudBase Postgres | Postgres 16 | 业务数据 |
| CloudBase 存储 | 对象存储 | 截图 / Cheat Sheet / 备份 |