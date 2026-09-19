// app/api/admin/sync-feishu/route.ts
// 从飞书多维表格拉取记录，upsert 到云端 MySQL。
//
// 调用：POST /api/admin/sync-feishu
// 鉴权：Authorization: Bearer ${SYNC_TOKEN}
// EnvParams 必填：
//   - LARK_APP_ID       飞书自建应用 AppID
//   - LARK_APP_SECRET   飞书自建应用 Secret（user_access_token 由 SDK 自动缓存/refresh）
//   - LARK_BASE_TOKEN   多维表格 app_token（bascnXXXX）
//   - LARK_TABLE_ID     数据表 id（tblXXXX）
//   - SYNC_TOKEN        调用方 Bearer token（自己生成）
//
// 增量策略：以飞书 slug 为业务键；同 slug 已存在则更新（避免每次全量覆盖更新时间）。
// 失败模式：任一行失败不影响其他行；最后返回 inserted/updated/skipped/errors 统计。
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import * as lark from "@larksuiteoapi/node-sdk";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 300;

interface FeishuBitableRecord {
  record_id: string;
  fields: Record<string, unknown>;
  created_time?: number;
  last_modified_time?: number;
}

interface SyncStats {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: { slug: string; reason: string }[];
  duration_ms: number;
}

export async function POST(req: Request) {
  const t0 = Date.now();
  try {

  // 1) 鉴权
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.SYNC_TOKEN ?? ""}`;
  if (!process.env.SYNC_TOKEN || auth !== expected) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  // 2) 校验 EnvParams
  const required = [
    "LARK_APP_ID",
    "LARK_APP_SECRET",
    "LARK_BASE_TOKEN",
    "LARK_TABLE_ID",
  ] as const;
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    return NextResponse.json(
      { ok: false, error: `missing env: ${missing.join(", ")}` },
      { status: 500 },
    );
  }

  // 3) 构造飞书 client
  const client = new lark.Client({
    appId: process.env.LARK_APP_ID!,
    appSecret: process.env.LARK_APP_SECRET!,
    appType: lark.AppType.SelfBuild,
    domain: lark.Domain.Feishu,
  });

  // 4) 拉取全部记录（自动分页）
  let allItems: FeishuBitableRecord[] = [];
  let pageToken: string | undefined;
  let pageCount = 0;
  do {
    const resp = await client.bitable.v1.appTableRecord.list({
      path: {
        app_token: process.env.LARK_BASE_TOKEN!,
        table_id: process.env.LARK_TABLE_ID!,
      },
      params: { page_size: 100, page_token: pageToken },
    });
    if (resp.code !== 0) {
      return NextResponse.json(
        { ok: false, error: `feishu list: ${resp.msg}`, code: resp.code },
        { status: 500 },
      );
    }
    allItems = allItems.concat((resp.data?.items ?? []) as FeishuBitableRecord[]);
    pageToken = resp.data?.page_token;
    pageCount++;
    // 防御：最多 50 页（5000 行）
    if (pageCount > 50) break;
  } while (pageToken);

  // 5) Upsert 每条
  const stats: SyncStats = {
    total: allItems.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    duration_ms: 0,
  };

  for (const item of allItems) {
    const f = item.fields;
    const slug = typeof f.slug === "string" ? f.slug.trim() : "";
    const title = typeof f.title === "string" ? f.title.trim() : "";
    const body =
      typeof f.body === "string"
        ? f.body
        : typeof (f.body as { text?: string } | undefined)?.text === "string"
          ? (f.body as { text: string }).text
          : "";
    const summary = typeof f.summary === "string" ? f.summary : null;
    const sourceUrl = typeof f.source_url === "string" ? f.source_url : null;
    const tags = Array.isArray(f.tags) ? (f.tags as string[]) : [];
    const statusRaw = Array.isArray(f.status)
      ? (f.status[0] as string)
      : typeof f.status === "string"
        ? f.status
        : "draft";
    const status = ["draft", "published", "archived"].includes(statusRaw)
      ? statusRaw
      : "draft";
    const publishedAt =
      typeof (f.published_at as number | string | undefined) === "number"
        ? new Date((f.published_at as number) / 1000)
        : typeof f.published_at === "string"
          ? parseFeishuDatetime(f.published_at)
          : null;

    if (!slug || !title || !body) {
      stats.skipped++;
      continue;
    }

    // published 状态必须有 published_at，否则用 NOW() 兜底（满足 CHECK 约束）
    const finalPublishedAt =
      status === "published" ? (publishedAt ?? new Date()) : publishedAt;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 查是否已存在
      const [existing] = (await conn.query(
        `SELECT id FROM articles WHERE slug = ?`,
        [slug],
      )) as [{ id: string }[], unknown];

      let articleId: string;
      if (existing.length > 0 && existing[0]) {
        articleId = existing[0].id;
        await conn.query(
          `UPDATE articles
             SET title = ?, summary = ?, content_markdown = ?, source_url = ?,
                 status = ?, published_at = ?
           WHERE id = ?`,
          [
            title,
            summary,
            body,
            sourceUrl,
            status,
            finalPublishedAt,
            articleId,
          ],
        );
        stats.updated++;
      } else {
        articleId = randomUUID();
        await conn.query(
          `INSERT INTO articles (id, slug, title, summary, content_markdown, source_url, status, published_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            articleId,
            slug,
            title,
            summary,
            body,
            sourceUrl,
            status,
            finalPublishedAt,
          ],
        );
        stats.inserted++;
      }

      // 同步 tags（先清后写，幂等）
      await conn.query(`DELETE FROM article_tags WHERE article_id = ?`, [
        articleId,
      ]);
      for (const tagName of tags) {
        const trimmed = tagName.trim();
        if (!trimmed) continue;
        // tags.slug 用连字符化的 tagName 派生
        const tagSlug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        await conn.query(
          `INSERT INTO tags (id, slug, name) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE name = VALUES(name)`,
          [randomUUID(), tagSlug, trimmed],
        );
        const [tagRow] = (await conn.query(
          `SELECT id FROM tags WHERE slug = ?`,
          [tagSlug],
        )) as [{ id: string }[], unknown];
        if (tagRow.length && tagRow[0]) {
          await conn.query(
            `INSERT IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)`,
            [articleId, tagRow[0].id],
          );
        }
      }

      await conn.commit();
    } catch (e: unknown) {
      await conn.rollback();
      const reason = e instanceof Error ? e.message : String(e);
      stats.errors.push({ slug, reason });
    } finally {
      conn.release();
    }
  }

  stats.duration_ms = Date.now() - t0;
  return NextResponse.json({ ok: true, ...stats });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "internal_error", detail: message, duration_ms: Date.now() - t0 },
      { status: 500 },
    );
  }
}

// 把飞书 datetime 字段（"YYYY-MM-DD HH:mm:ss" 或毫秒时间戳）转成 JS Date
function parseFeishuDatetime(s: string): Date | null {
  // 飞书 datetime 字段如果是文本（少见），形如 "2026-01-01 10:00:00"
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):?(\d{2})?$/.exec(s);
  if (m) {
    return new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6] ?? "0"),
    );
  }
  // 否则尝试 ISO
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
