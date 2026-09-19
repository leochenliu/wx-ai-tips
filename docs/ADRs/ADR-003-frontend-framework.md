# ADR-003: 前端框架选择

> 状态：✅ Accepted（2026-09-19）

## 背景
需要一个 SEO 友好、可 SSR、可与 CloudBase 函数同仓部署的前端。

## 选项
- **A. Next.js 15 App Router（推荐）**
- **B. Astro**
- **C. 纯 SPA (Vite + React)**

## 决策
**选 A. Next.js 15 App Router**。

理由：
- SSR/ISR 是内容站 SEO 刚需
- App Router 同时支持 server component + client component，平衡 SEO 与交互
- 与 CloudBase 函数可共用数据库/凭证
- ISR 让文章变更不需重建整个站点

## 后果
- ✅ 一套构建搞定前后端
- ⚠️ 学习曲线：需要理解 Server Component / Client Component 边界
- ❌ 锁定 Next.js；迁移到 Astro / SvelteKit 有改写成本

## 验证项
- [ ] CloudBase 前端托管对 Next.js 15 App Router 的支持（**待核实**）