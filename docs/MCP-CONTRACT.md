# MCP-CONTRACT — 微信 AI 使用技巧整理站

> Stage 05 交付物。MCP 接口契约（独立于 OpenAPI，使用 JSON-RPC 协议）。

## 1. 端点

```
POST https://wx-ai-tips.example.com/mcp
Content-Type: application/json
Accept: application/json, text/event-stream
Authorization: Bearer <MCP_TOKEN>
MCP-Session-Id: <optional>
```

## 2. 协议

MCP Streamable HTTP（2025-03-26+ 标准）。每个 JSON-RPC 请求是独立的 HTTP POST；服务器响应单个 JSON 对象或 SSE 流。

## 3. 工具清单

### Tool: search_articles

**描述**：按关键词搜索已发布的微信 AI 技巧文章。

**输入 schema**（JSON Schema）：
```json
{
  "type": "object",
  "properties": {
    "query": { "type": "string", "minLength": 1, "maxLength": 200 },
    "limit": { "type": "integer", "minimum": 1, "maximum": 20, "default": 5 },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "可选；限定返回这些 tag 的文章"
    }
  },
  "required": ["query"]
}
```

**输出**（成功）：
```json
{
  "query": "微信支付 AI 专属卡",
  "total": 8,
  "items": [
    {
      "id": "uuid",
      "slug": "wechat-pay-ai-card-open",
      "title": "微信支付 AI 专属卡开通指南",
      "summary": "本文介绍微信支付 AI 专属卡的开通步骤...",
      "url": "https://wx-ai-tips.example.com/articles/wechat-pay-ai-card-open",
      "tags": ["wechat-pay", "ai-card", "guide"],
      "publishedAt": "2026-09-15T10:00:00Z",
      "relevance": 0.92
    }
  ]
}
```

**错误码**（参见 API-ERRORS §3）：
- `INVALID_QUERY`：query 为空或超长
- `RATE_LIMIT_EXCEEDED`：超出 200 RPM

### Tool: get_article

**描述**：按 ID 获取文章完整内容。

**输入**：
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" }
  },
  "required": ["id"]
}
```

**输出**：
```json
{
  "id": "uuid",
  "slug": "wechat-pay-ai-card-open",
  "title": "微信支付 AI 专属卡开通指南",
  "summary": "...",
  "contentMarkdown": "## 步骤一\n\n...",
  "sourceUrl": "https://feishu.example.com/wiki/xxx",
  "tags": ["wechat-pay", "ai-card"],
  "publishedAt": "2026-09-15T10:00:00Z",
  "screenshots": [
    {
      "id": "uuid",
      "url": "https://cdn.example.com/screenshots/abc.png",
      "altText": "微信支付 AI 专属卡开通界面",
      "containsPii": false
    }
  ]
}
```

**约束**：
- 仅返回 status=published 的文章
- 草稿 / 归档 返回 `ARTICLE_NOT_FOUND`

**错误码**：
- `ARTICLE_NOT_FOUND`：id 不存在或非 published

### Tool: list_tags

**描述**：列出标签。

**输入**：
```json
{
  "type": "object",
  "properties": {
    "prefix": { "type": "string", "description": "按前缀过滤（slug 开头）" },
    "limit": { "type": "integer", "minimum": 1, "maximum": 100, "default": 50 }
  }
}
```

**输出**：
```json
{
  "items": [
    {
      "slug": "wechat-pay",
      "name": "微信支付",
      "articleCount": 12
    },
    {
      "slug": "ai-card",
      "name": "AI 专属卡",
      "articleCount": 5
    }
  ]
}
```

## 4. 错误响应（JSON-RPC 错误）

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params: query is required",
    "data": {
      "code": "INVALID_QUERY",
      "traceId": "uuid"
    }
  }
}
```

错误码：
| JSON-RPC code | 含义 |
|---|---|
| -32700 | Parse error |
| -32600 | Invalid Request |
| -32601 | Method not found |
| -32602 | Invalid params（业务参数错误）|
| -32603 | Internal error |
| -32000 ~ -32099 | 服务端自定义错误 |

## 5. 资源（Resources）

本项目 v1.0 不暴露 MCP Resources（文件 / 数据订阅）；仅暴露 Tools。如有需要 v1.1 加入。

## 6. 提示（Prompts）

不暴露预定义 Prompts；客户端自行构造。

## 7. 安全

- 必须 `Authorization: Bearer <MCP_TOKEN>` 头
- 必须校验 `Origin` 头防 DNS rebinding
- 仅暴露 GET/POST；DELETE 不支持
- 日志含 traceId 便于审计

## 8. 客户端配置示例

### Claude Desktop（`claude_desktop_config.json`）
```json
{
  "mcpServers": {
    "wx-ai-tips": {
      "url": "https://wx-ai-tips.example.com/mcp",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer ${MCP_TOKEN}"
      }
    }
  }
}
```

### Cursor
在 MCP 设置中添加：
- URL: `https://wx-ai-tips.example.com/mcp`
- Transport: Streamable HTTP
- Header: `Authorization: Bearer <token>`

## 9. 兼容性

- 仅支持 MCP Streamable HTTP（2025-03-26+）
- 旧 SSE 客户端不支持
- stdio 客户端可通过 MCP 桥接（如 mcp-remote）