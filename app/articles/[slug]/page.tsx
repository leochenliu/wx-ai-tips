/* eslint-disable jsx-a11y/heading-has-content, jsx-a11y/anchor-has-content --
   react-markdown injects the real text content via spread props at runtime;
   the static rule cannot see it through {...p}. */
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { notFound } from "next/navigation";
import { getArticleBySlug, listTagsForArticle } from "@/lib/repositories/articles";

export const dynamic = "force-dynamic";

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const tags = await listTagsForArticle(article.id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/articles" className="text-sm text-blue-600 hover:underline">
        ← 返回文章列表
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-gray-900">{article.title}</h1>

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((t) => (
            <span
              key={t.slug}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
            >
              #{t.name}
            </span>
          ))}
        </div>
      )}

      <article className="mt-8">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ node: _node, ...p }) => <h1 className="mb-4 mt-8 text-2xl font-bold text-gray-900" {...p} />,
            h2: ({ node: _node, ...p }) => <h2 className="mb-3 mt-7 text-xl font-bold text-gray-900" {...p} />,
            h3: ({ node: _node, ...p }) => <h3 className="mb-2 mt-6 text-lg font-semibold text-gray-900" {...p} />,
            p: ({ node: _node, ...p }) => <p className="my-4 leading-7 text-gray-700" {...p} />,
            ul: ({ node: _node, ...p }) => <ul className="my-4 list-disc space-y-1 pl-6 text-gray-700" {...p} />,
            ol: ({ node: _node, ...p }) => <ol className="my-4 list-decimal space-y-1 pl-6 text-gray-700" {...p} />,
            li: ({ node: _node, ...p }) => <li className="leading-7" {...p} />,
            a: ({ node: _node, ...p }) => <a className="text-blue-600 hover:underline" {...p} />,
            blockquote: ({ node: _node, ...p }) => (
              <blockquote className="my-4 border-l-4 border-gray-300 pl-4 text-gray-500" {...p} />
            ),
            code: ({ node: _node, className, children, ...props }) => {
              const isBlock = /language-/.test(className ?? "");
              if (isBlock) return <code className={className} {...props}>{children}</code>;
              return (
                <code
                  className="rounded bg-gray-100 px-1.5 py-0.5 text-[0.85em] text-red-600"
                  {...props}
                >
                  {children}
                </code>
              );
            },
            pre: ({ node: _node, ...p }) => (
              <pre className="my-4 overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100" {...p} />
            ),
            table: ({ node: _node, ...p }) => (
              <div className="my-4 overflow-x-auto">
                <table className="w-full border-collapse text-sm" {...p} />
              </div>
            ),
            th: ({ node: _node, ...p }) => (
              <th className="border border-gray-300 bg-gray-100 px-3 py-2 text-left font-semibold" {...p} />
            ),
            td: ({ node: _node, ...p }) => <td className="border border-gray-300 px-3 py-2" {...p} />,
            hr: ({ node: _node, ...p }) => <hr className="my-8 border-gray-200" {...p} />,
          }}
        >
          {article.content_markdown}
        </ReactMarkdown>
      </article>

      {article.source_url && (
        <p className="mt-10 text-xs text-gray-400">来源：{article.source_url}</p>
      )}
    </main>
  );
}
