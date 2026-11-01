-- Folio schema. Works on MySQL 8, MariaDB 10.5+ and TiDB Cloud Serverless.

CREATE TABLE IF NOT EXISTS articles (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source        VARCHAR(32)  NOT NULL,           -- 'conversation' | 'simplewiki'
  source_id     VARCHAR(191) NOT NULL,
  title         VARCHAR(300) NOT NULL,
  dek           VARCHAR(600) NULL,               -- short standfirst
  author        VARCHAR(200) NULL,
  url           VARCHAR(500) NOT NULL,
  topic         VARCHAR(32)  NOT NULL,
  body          MEDIUMTEXT   NOT NULL,           -- paragraphs separated by blank lines, headings prefixed "## "
  word_count    INT UNSIGNED NOT NULL,
  difficulty    DECIMAL(5,2) NOT NULL,           -- see src/lib/level.ts
  cefr          VARCHAR(2)   NOT NULL,           -- estimated A1..C2
  band          TINYINT UNSIGNED NOT NULL,       -- 1 foundation .. 4 advanced
  published_at  DATETIME     NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_articles_source (source, source_id),
  KEY idx_articles_band_topic (band, topic)
);

CREATE TABLE IF NOT EXISTS word_cache (
  word        VARCHAR(64) PRIMARY KEY,
  payload     MEDIUMTEXT  NULL,                  -- JSON; NULL means "no entry found"
  fetched_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_words (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reader_id   CHAR(36)     NOT NULL,             -- anonymous id kept in the reader's browser
  word        VARCHAR(64)  NOT NULL,
  definition  VARCHAR(600) NULL,
  context     VARCHAR(600) NULL,
  article_id  INT UNSIGNED NULL,
  lookups     INT UNSIGNED NOT NULL DEFAULT 0,   -- times the reader tapped this word
  in_deck     TINYINT(1)   NOT NULL DEFAULT 0,   -- chosen for flashcards and quizzes
  quiz_right  INT UNSIGNED NOT NULL DEFAULT 0,
  quiz_wrong  INT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_saved_reader_word (reader_id, word)
);
