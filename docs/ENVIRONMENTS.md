# Environments — 微信 AI 使用技巧整理站

> Stage 04 交付物。本地 / 测试 / 预览 / 生产环境差异。

## 环境总览

| 环境 | 用途 | 部署位置 | 数据 | 访问范围 |
|---|---|---|---|---|
| 本地开发（dev） | 作者本机开发 | `localhost:3000` | 飞书 sandbox + 本地 Postgres（Docker） | 仅本机 |
| 测试（test） | 自动化测试 | CI（GitHub Actions） | 飞书 sandbox mock + 测试 DB | CI runner |
| 预览（preview） | PR 验证 | CloudBase 预览环境 | 测试 DB | 作者 + 临时 URL |
| 生产（prod） | 公网服务 | CloudBase 前端托管 + 函数 | 生产 DB + 存储 | 公网 |

## 环境差异

### 1. 凭证
| 环境 | 凭证来源 | 说明 |
|---|---|---|
| 本地 | `.env.local`（git 忽略） | 飞书自建应用 + CloudBase 密钥 |
| 测试 | GitHub Secrets | 与本地一致但用 sandbox |
| 预览 | CloudBase 预览环境变量 | 与生产相同的密钥池，但限定域名 |
| 生产 | CloudBase 控制台 / 环境变量 | 强密钥；季度轮换 |

### 2. 数据库
| 环境 | 实例 | 备注 |
|---|---|---|
| 本地 | Docker Postgres 16 | 与生产 schema 一致 |
| 测试 | CI 临时 Postgres | 每个 PR 独立 |
| 预览 | CloudBase Postgres 测试实例 | 数据每周重置 |
| 生产 | CloudBase Postgres 生产实例 | 周备 + 月备 |

### 3. 函数配置
| 环境 | 内存 | 超时 | 实例 |
|---|---|---|---|
| 本地 | n/a | n/a | 直接 Node |
| 测试 | 512MB | 60s | CI runner |
| 预览 | 512MB | 60s | CloudBase 函数（按需） |
| 生产 | 1GB | 60s；cheatsheet 180s | CloudBase 函数（按需） |

### 4. 特性开关
| 环境 | puppeteer | FTS zhparser | MCP 暴露 |
|---|---|---|---|
| 本地 | 可选 | 默认 simple | 仅作者 |
| 测试 | 关闭 | simple | 关闭 |
| 预览 | 开启 | simple | 关闭 |
| 生产 | 开启 | zhparser（如可用） | 开启 |

### 5. 监控
| 环境 | 监控 |
|---|---|
| 本地 | 控制台日志 |
| 测试 | CI 日志 |
| 预览 | CloudBase 函数日志 |
| 生产 | CloudBase 监控 + 自托管 Uptime Kuma |

## 部署流水线

```
local dev
   │ git push
   ▼
GitHub Actions CI (lint + test + typecheck)
   │ PR open
   ▼
CloudBase 预览环境（自动）
   │ PR merge to main
   ▼
GitHub Actions CD (cloudbase deploy)
   ▼
CloudBase 生产环境
```

## 数据迁移路径
- 本地 → 预览：手动 dump + 还原
- 预览 → 生产：**永远不直接迁移**；生产数据来自飞书再次导入
- 生产 → 本地：每周备份 dump 到 `backups/` 目录，可拉回本地恢复