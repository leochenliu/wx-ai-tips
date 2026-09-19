import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold">微信 AI 技巧站</h1>
      <p className="mt-4 text-gray-600">
        整理微信 AI 使用技巧：文字 + 截图 + 搜索 + Tag。
      </p>
      <p className="mt-2 text-sm text-gray-400">
        scaffold 完成 · Stage 00–13 全过 · 本地开发可用
      </p>
      <Link
        href="/articles"
        className="mt-8 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        查看文章 →
      </Link>
    </main>
  );
}