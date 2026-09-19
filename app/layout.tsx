import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "微信 AI 技巧站",
  description: "整理微信 AI 使用技巧：文字 + 截图 + 搜索 + Tag",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: 浏览器扩展（Dark Reader / 翻译插件 / 主题切换）
    // 经常在 React 拿到 HTML 之前注入 style/class 属性，导致 SSR 输出和客户端
    // 第一次渲染的属性对不上。Next.js 15 + React 19 的 RSC payload 也有少数
    // 已知无害的差异。这个属性只压制 <html> 的警告，子组件仍正常 hydrate。
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}