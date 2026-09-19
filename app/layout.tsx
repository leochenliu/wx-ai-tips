import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "微信 AI 技巧站",
  description: "整理微信 AI 使用技巧：文字 + 截图 + 搜索 + Tag",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}