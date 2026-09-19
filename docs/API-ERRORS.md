# API-ERRORS — 微信 AI 使用技巧整理站

> Stage 05 交付物。统一错误码、响应结构与处理指南。

## 1. 错误响应结构

所有错误响应均使用以下结构：

```json
{
  "code": "string",
  "message": "string",
  "details": { /* 可选 */ },
  "traceId": "uuid"
}
```

`code` 是稳定的机器可读码；`message` 是面向用户的中文说明；`traceId` 用于跨服务追踪。

## 2. HTTP 状态码映射

| HTTP | 含义 | 何时使用 |
|---|---|---|
| 400 | Bad Request | 请求体 / 查询参数不合法 |
| 401 | Unauthorized | 后台 / MCP 未携带 Bearer Token |
| 403 | Forbidden | Token 无效 / IP 不在白名单 |
| 404 | Not Found | slug / id 不存在 |
| 409 | Conflict | slug 冲突 / 重复请求 |
| 410 | Gone | 文章已归档（30 天内） |
| 422 | Unprocessable Entity | 业务规则违反（合并目标在被合并列表） |
| 429 | Too Many Requests | 速率限制触发 |
| 500 | Internal Server Error | 未捕获异常 |
| 502 | Bad Gateway | 上游（飞书 / Postgres）不可达 |
| 503 | Service Unavailable | CloudBase 环境维护中 |
| 504 | Gateway Timeout | 函数超时 |

## 3. 业务错误码

| code | HTTP | 含义 | 处理建议 |
|---|---|---|---|
| ARTICLE_NOT_FOUND | 404 | 文章不存在 | 检查 slug |
| ARTICLE_GONE | 410 | 文章已归档 | 显示「已下架」页 |
| TAG_NOT_FOUND | 404 | Tag 不存在 | 检查 slug / alias |
| TAG_SLUG_CONFLICT | 409 | Tag slug 已存在 | 改 slug |
| TAG_HAS_ARTICLES | 409 | 删除时仍有文章关联 | 先合并或传 force=true |
| IMPORT_ALREADY_RUNNING | 409 | 已有导入在跑 | 等当前完成 |
| IMPORT_FAILED | 500 | 导入失败 | 看 ImportEvent.errors |
| INVALID_QUERY | 400 | q 为空 / 超长 | 检查参数 |
| RATE_LIMIT_EXCEEDED | 429 | 触发限流 | 退避重试 |
| UNAUTHORIZED | 401 | 缺 Bearer Token | 加 Authorization 头 |
| FORBIDDEN_IP | 403 | IP 不在白名单 | 联系作者加白 |
| INVALID_BEARER_TOKEN | 403 | Token 无效或过期 | 重新生成 |
| MCP_TOOL_NOT_FOUND | 404 | MCP tool 名不存在 | 检查 method 名 |
| MCP_INVALID_PARAMS | 400 | MCP 工具参数错误 | 检查 schema |
| INTERNAL_ERROR | 500 | 未捕获异常 | 上报 traceId |

## 4. 分页与排序约定

- 默认 `page=1` / `pageSize=20`，最大 100
- 列表接口统一返回 `Paginated<T>` 结构
- 排序：文章列表默认 `publishedAt DESC`；tag 列表默认 `name ASC`
- 游标式分页（`nextCursor`）仅在 tag 列表使用，文章列表用 page/pageSize

## 5. 幂等性

| 接口 | 幂等键 |
|---|---|
| POST /admin/import | 由 mode + startedAt 决定；同 mode 10 分钟内重复请求返回 409 |
| PUT /admin/tags/{slug} | slug 唯一；重命名为已有 slug 返回 409 |
| POST /admin/tags/merge | fromSlugs + toSlug 构成幂等键 |
| DELETE /admin/tags/{slug} | 已删除返回 204（幂等） |

## 6. 缓存策略

| 接口 | 缓存 | 失效 |
|---|---|---|
| GET /api/articles | 60s ISR | 后台写时 revalidate |
| GET /api/articles/{slug} | 300s ISR | 文章更新时 revalidate |
| GET /api/tags | 300s | 后台写时 revalidate |
| GET /api/tags/{slug} | 300s | 后台写时 revalidate |
| GET /api/search | 不缓存 | n/a |
| 所有 /api/admin/* | 不缓存 | n/a |

## 7. 速率限制

| 接口 | 限制 |
|---|---|
| GET /api/* | 100 RPM / IP |
| GET /api/search | 30 RPM / IP |
| POST /api/admin/* | 10 RPM / IP（额外 IP 白名单） |
| MCP /mcp | 200 RPM / Token |

超限返回 429 + `Retry-After: <seconds>` 头。

## 8. 版本策略

- URL 路径不带版本（`/api/articles`），契约内 major 版本
- Breaking change 必须递增 `openapi.yaml` 的 `version` 字段
- 旧契约保留至少 6 个月
- 客户端可通过 `Accept: application/vnd.wxaitips.v2+json` 显式请求版本

## 9. 追踪与日志

- 每个请求生成 `traceId`（UUID v4）
- 写入 CloudBase 函数日志
- 错误响应中带 `traceId` 便于排查

## 10. CORS

- 公网 API：`Access-Control-Allow-Origin: *`
- 后台 / MCP API：仅允许同源（无 CORS 头）