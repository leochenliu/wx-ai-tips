# ADR-004: Cheat Sheet 渲染方案

> 状态：✅ Accepted（2026-09-19）

## 背景
需要从 Article 生成 PDF（A4）+ PNG（1080×1440）两种 Cheat Sheet。

## 选项
- **A. puppeteer（推荐）**
- **B. Playwright**
- **C. weasyprint（仅 PDF）**
- **D. 服务端 SVG → 拼装 PNG**

## 决策
**MVP 用 A. puppeteer**；中文 CJK 字体打包到函数镜像里。

理由：
- PDF + PNG 双产出用同一引擎
- 完整 CSS 支持（包括 Web Font、flex、grid）
- 与 Chrome DevTools Protocol 调试一致

## 后果
- ✅ 双格式统一
- ⚠️ 冷启动慢：500ms~2s；预热或长驻可解
- ⚠️ 镜像体积大（puppeteer + chromium ~ 200MB）
- ⚠️ 中文 CJK 字体需明确打包路径

## 备选
- Playwright 启动更快；chromium 体积更小
- weasyprint 适合纯文档（不支持 JS 与 web 字体）

## 验证项（U2）
- [ ] CloudBase 函数运行时是否支持 chromium 启动
- [ ] 镜像体积与冷启动可接受范围