import Link from "next/link";
import type { Route } from "next";
import { listPublishedArticles } from "@/lib/repositories/articles";

// 本地开发直接读 DB，不做静态预渲染
export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const articles = await listPublishedArticles();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900">全部文章</h1>
      <p className="mt-2 text-sm text-gray-500">
        {articles.length} 篇 · 微信 AI 使用技巧整理
      </p>

      {articles.length === 0 ? (
        <p className="mt-10 text-gray-500">
          还没有文章。先执行 <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">npm run db:seed</code> 灌入 demo 数据。
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {articles.map((a) => (
            <li key={a.id}>
              <Link
                href={`/articles/${a.slug}` as Route}
                className="block rounded-lg border border-gray-200 p-4 transition hover:bg-gray-50"
              >
                <h2 className="text-xl font-semibold text-gray-900">{a.title}</h2>
                {a.summary && (
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{a.summary}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
