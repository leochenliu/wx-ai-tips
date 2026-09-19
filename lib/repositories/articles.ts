// lib/repositories/articles.ts — 文章仓储（MySQL 实现）
// 遵循 DOMAIN-INVARIANTS.md：只返回 status='published' 的文章给前台。
import { query } from "@/lib/db";

export type ArticleSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  published_at: Date | null;
};

export type Article = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content_markdown: string;
  source_url: string | null;
  published_at: Date | null;
  status: string;
};

export type Tag = { slug: string; name: string };

export async function listPublishedArticles(limit = 50): Promise<ArticleSummary[]> {
  // MySQL 默认：ORDER BY published_at DESC 时 NULL 排在最后（等价于 Postgres 的 NULLS LAST）
  return query<ArticleSummary>(
    `SELECT id, slug, title, summary, published_at
     FROM articles
     WHERE status = 'published'
     ORDER BY published_at DESC
     LIMIT ?`,
    [limit],
  );
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const rows = await query<Article>(
    `SELECT id, slug, title, summary, content_markdown, source_url, published_at, status
     FROM articles
     WHERE slug = ? AND status = 'published'`,
    [slug],
  );
  return rows[0] ?? null;
}

export async function listTagsForArticle(articleId: string): Promise<Tag[]> {
  return query<Tag>(
    `SELECT t.slug, t.name
     FROM tags t
     JOIN article_tags at ON at.tag_id = t.id
     WHERE at.article_id = ?
     ORDER BY t.name`,
    [articleId],
  );
}
