# ADR-001: 选择 CloudBase 作为后端 BaaS

> 状态：✅ Accepted（2026-09-19）
> 决策者：作者

## 背景
需要一个公网 Web 站点的后端：数据库、对象存储、函数、MCP server。要求：免费层、低运维、与前端同账号。

## 选项
- **A. CloudBase（推荐）**：腾讯云开发，本会话已连接 connector；数据库 + 存储 + 函数 + MCP 一体
- **B. Supabase**：开源 BaaS；免费层友好；需另接部署平台
- **C. Neon + Cloudflare R2 + Cloudflare Workers**：各自最强；但需自己拼权限

## 决策
选 **A. CloudBase**。

理由：
1. 已连接，零配置起步成本
2. 数据库 / 存储 / 函数 / MCP 同平台，账号与凭证统一
3. 函数支持 MCP stdio / SSE 部署
4. 公网域名、CDN、SSL 一键开通

## 后果
- ✅ 单平台运维；统一账单（虽然免费层够用）
- ✅ 数据库连接、存储上传都走内网
- ⚠️ 中国大陆节点需备案；境外节点不需备案但访问慢
- ⚠️ MCP 传输协议兼容需在 Stage 04a 验证
- ❌ 数据库迁出成本：导出到 Neon / RDS 需要 pg_dump + schema 转换

## 验证项（待 Stage 04a 落实）
- [ ] 免费层最新限额（U1）
- [ ] 函数 puppeteer 支持（U2）
- [ ] MCP 协议宿主兼容（U4）