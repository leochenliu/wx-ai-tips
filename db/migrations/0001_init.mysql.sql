-- ============================================
-- 微信 AI 使用技巧整理站 — 初始数据库 schema (MySQL / TDSQL-C 版)
-- Migration 0001_init.mysql.sql
-- ============================================
-- 必须幂等：可重复执行不报错（CREATE TABLE IF NOT EXISTS）
-- 严格遵循 DOMAIN-INVARIANTS.md (I-1 ~ I-7)
--
-- 与原始 Postgres 版本(0001_init.sql)的差异：
--   UUID / gen_random_uuid()  -> CHAR(36) DEFAULT (UUID())
--   JSONB                     -> JSON
--   TIMESTAMPTZ               -> TIMESTAMP
--   tsvector / GIN 全文搜索    -> FULLTEXT ... WITH PARSER ngram (支持中文分词)
--   plpgsql 触发器            -> 列级 ON UPDATE CURRENT_TIMESTAMP
--   CHECK 约束                -> MySQL 8.0 起强制校验
-- 要求：MySQL 8.0.13+（表达式默认值 / 强制 CHECK）

CREATE TABLE IF NOT EXISTS articles (
  id              CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  slug            VARCHAR(80)  NOT NULL,
  title           VARCHAR(120) NOT NULL,
  summary         VARCHAR(300),
  content_markdown TEXT         NOT NULL,
  source_url      TEXT,
  status          VARCHAR(20)  NOT NULL DEFAULT 'published',
  published_at    TIMESTAMP    NULL,
  archived_at     TIMESTAMP    NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT articles_slug_unique UNIQUE (slug),
  CONSTRAINT articles_status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT articles_published_fields CHECK (
    status != 'published' OR (title IS NOT NULL AND content_markdown IS NOT NULL AND published_at IS NOT NULL)
  ),
  INDEX articles_status_published_at_idx (status, published_at DESC),
  -- 中文全文搜索：ngram 解析器按字切分，MATCH...AGAINST 命中
  FULLTEXT KEY articles_search_idx (title, summary, content_markdown) WITH PARSER ngram
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- tags ----------
CREATE TABLE IF NOT EXISTS tags (
  id          CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  slug        VARCHAR(80)  NOT NULL,
  name        VARCHAR(50)  NOT NULL,
  aliases     JSON         NOT NULL DEFAULT ('[]'),
  description VARCHAR(500),
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT tags_slug_unique UNIQUE (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- article_tags（多对多关联）----------
CREATE TABLE IF NOT EXISTS article_tags (
  article_id  CHAR(36)    NOT NULL,
  tag_id      CHAR(36)    NOT NULL,
  created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (article_id, tag_id),
  CONSTRAINT article_tags_article_fk FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT article_tags_tag_fk     FOREIGN KEY (tag_id)     REFERENCES tags(id)     ON DELETE CASCADE,
  INDEX article_tags_tag_id_idx (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- screenshots ----------
CREATE TABLE IF NOT EXISTS screenshots (
  id            CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  article_id    CHAR(36)     NOT NULL,
  storage_key   TEXT         NOT NULL,
  mime_type     VARCHAR(50)  NOT NULL,
  width         INT,
  height        INT,
  alt_text      VARCHAR(200),
  ocr_text      TEXT,
  sort_order    INT          NOT NULL DEFAULT 0,
  contains_pii  TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT screenshots_article_fk FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT screenshots_mime_check CHECK (
    mime_type IN ('image/png', 'image/jpeg', 'image/webp', 'image/gif')
  ),
  INDEX screenshots_article_id_idx (article_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- import_events（不可变审计）----------
CREATE TABLE IF NOT EXISTS import_events (
  id           CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  source       VARCHAR(20)  NOT NULL,
  status       VARCHAR(20)  NOT NULL DEFAULT 'running',
  started_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at  TIMESTAMP    NULL,
  counts       JSON         NOT NULL DEFAULT ('{}'),
  errors       JSON         NOT NULL DEFAULT ('[]'),

  CONSTRAINT import_events_source_check CHECK (source IN ('feishu')),
  CONSTRAINT import_events_status_check CHECK (status IN ('running', 'succeeded', 'failed')),
  INDEX import_events_started_at_idx (started_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
