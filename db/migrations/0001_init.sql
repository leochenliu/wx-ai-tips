-- ============================================
-- 微信 AI 使用技巧整理站 — 初始数据库 schema
-- Migration 0001_init.sql
-- ============================================
-- 必须幂等：可重复执行不报错
-- 严格遵循 DOMAIN-INVARIANTS.md (I-1 ~ I-7)

BEGIN;

-- ---------- articles ----------
CREATE TABLE IF NOT EXISTS articles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(80)  NOT NULL,
  title           VARCHAR(120) NOT NULL,
  summary         VARCHAR(300),
  content_markdown TEXT         NOT NULL,
  source_url      TEXT,
  status          VARCHAR(20)  NOT NULL DEFAULT 'published',
  published_at    TIMESTAMPTZ,
  archived_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT articles_slug_unique UNIQUE (slug),
  CONSTRAINT articles_status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT articles_published_fields CHECK (
    status != 'published' OR (title IS NOT NULL AND content_markdown IS NOT NULL AND published_at IS NOT NULL)
  )
);

-- slug 索引（slug 已是 UNIQUE，自带索引）
-- published 列表查询
CREATE INDEX IF NOT EXISTS articles_published_at_idx
  ON articles (published_at DESC) WHERE status = 'published';

-- 全文搜索（Postgres FTS）
-- zhparser 默认未启用；MVP 用 simple 词典
ALTER TABLE articles ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(content_markdown, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS articles_search_tsv_idx
  ON articles USING gin (search_tsv);

-- ---------- tags ----------
CREATE TABLE IF NOT EXISTS tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(80)  NOT NULL,
  name        VARCHAR(50)  NOT NULL,
  aliases     JSONB        NOT NULL DEFAULT '[]'::jsonb,
  description VARCHAR(500),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT tags_slug_unique UNIQUE (slug)
);

-- ---------- article_tags（多对多关联）----------
CREATE TABLE IF NOT EXISTS article_tags (
  article_id  UUID         NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id      UUID         NOT NULL REFERENCES tags(id)     ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT article_tags_pk PRIMARY KEY (article_id, tag_id)
);

CREATE INDEX IF NOT EXISTS article_tags_tag_id_idx ON article_tags (tag_id);

-- ---------- screenshots ----------
CREATE TABLE IF NOT EXISTS screenshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id    UUID         NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  storage_key   TEXT         NOT NULL,
  mime_type     VARCHAR(50)  NOT NULL,
  width         INT,
  height        INT,
  alt_text      VARCHAR(200),
  ocr_text      TEXT,
  sort_order    INT          NOT NULL DEFAULT 0,
  contains_pii  BOOLEAN      NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT screenshots_mime_check CHECK (
    mime_type IN ('image/png', 'image/jpeg', 'image/webp', 'image/gif')
  )
);

CREATE INDEX IF NOT EXISTS screenshots_article_id_idx
  ON screenshots (article_id, sort_order);

-- ---------- import_events（不可变审计）----------
CREATE TABLE IF NOT EXISTS import_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source       VARCHAR(20)  NOT NULL,
  status       VARCHAR(20)  NOT NULL DEFAULT 'running',
  started_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  finished_at  TIMESTAMPTZ,
  counts       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  errors       JSONB        NOT NULL DEFAULT '[]'::jsonb,

  CONSTRAINT import_events_source_check CHECK (source IN ('feishu')),
  CONSTRAINT import_events_status_check CHECK (status IN ('running', 'succeeded', 'failed'))
);

CREATE INDEX IF NOT EXISTS import_events_started_at_idx
  ON import_events (started_at DESC);

-- ---------- updated_at 触发器 ----------
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS articles_set_updated_at ON articles;
CREATE TRIGGER articles_set_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION trg_set_updated_at();

COMMIT;

-- ============================================
-- 行级安全（RLS）— MVP 暂不启用，v1.1 加
-- ============================================
-- ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "public_read_published" ON articles
--   FOR SELECT USING (status = 'published');