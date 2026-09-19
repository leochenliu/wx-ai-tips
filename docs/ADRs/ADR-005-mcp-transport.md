# ADR-005: MCP 传输协议

> 状态：✅ Accepted（2026-09-19）
> 决策者：作者

## 背景
需要让外部 LLM Agent 通过 MCP 调用站点能力（搜索 / 详情 / tag 列表）。

## 选项
- **A. stdio**：本地子进程，远程不可用 ❌
- **B. SSE（HTTP+SSE）**：2024-11-05 起已被 MCP 规范弃用，2026 年中完全废弃 ❌
- **C. Streamable HTTP（推荐）**：2025-03-26 起新标准，单 HTTP 端点 + POST；serverless 原生

## 决策
**选 C. Streamable HTTP**。

理由：
1. MCP 官方 2025-03-26 起的默认传输，2026 年生态已全面切换
2. 标准 HTTP POST + JSON，CloudBase HTTP 触发函数原生支持
3. 无状态、无长连接，**FREE 层即可承载**（这与本项目预算策略高度匹配）
4. 客户端工具链（Claude Desktop / Cursor / VS Code / WorkBuddy）均已支持
5. 长任务（如未来流式输出）才升级 SSE；本项目查询都是短响应，纯 JSON 即可

## 部署拓扑
- CloudBase HTTP 触发函数 `mcp-server` 暴露 `/mcp` 单端点
- 客户端 POST JSON-RPC 请求 → 函数处理 → 返回 JSON-RPC 响应
- 鉴权：HTTP Bearer Token（环境变量配置）

## 安全要求（来自 MCP 2026-07-28 规范）
- 校验 Origin 头防 DNS rebinding；非法返回 403
- 仅 127.0.0.1 监听（CloudBase 函数运行时已合规）
- 必须认证；本项目用 Bearer Token

## 后果
- ✅ FREE 层即可承载
- ✅ 函数超时 3s 对查询够用（Postgres FTS 通常 < 300ms）
- ✅ 单 endpoint，部署简单
- ⚠️ 客户端调用方需使用支持 Streamable HTTP 的 MCP SDK 版本（>= 2025-03-26）

## 验证项
- [ ] MCP Inspector 联通
- [ ] 客户端 Claude Desktop / Cursor 配置示例
- [ ] 鉴权 Token 生成与轮换