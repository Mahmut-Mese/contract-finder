-- Contract Finder – Phase 1 schema
-- Run this against the existing contract_finder database.

USE contract_finder;

-- ── Matched jobs: user ↔ job with relevance score ──
CREATE TABLE IF NOT EXISTS matched_jobs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         VARCHAR(36)  NOT NULL,
  job_id          INT          NOT NULL,
  score           INT          NOT NULL DEFAULT 0  COMMENT 'Relevance score 0-100',
  matched_skills  TEXT         COMMENT 'Comma-separated skills that matched',
  status          VARCHAR(20)  NOT NULL DEFAULT 'new' COMMENT 'new, viewed, saved, dismissed',
  notified        BOOLEAN      NOT NULL DEFAULT FALSE COMMENT 'Email sent?',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_user_job (user_id, job_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id)  REFERENCES jobs(id)  ON DELETE CASCADE,

  INDEX idx_user_status (user_id, status),
  INDEX idx_user_score  (user_id, score DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── In-app notifications ──
CREATE TABLE IF NOT EXISTS notifications (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         VARCHAR(36)  NOT NULL,
  type            VARCHAR(50)  NOT NULL DEFAULT 'new_matches' COMMENT 'new_matches, system',
  title           VARCHAR(500) NOT NULL,
  body            TEXT,
  link            VARCHAR(500) COMMENT 'URL to navigate to on click',
  is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_unread (user_id, is_read, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Match run logs (like fetch_logs but for matching) ──
CREATE TABLE IF NOT EXISTS match_logs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  started_at      DATETIME     NOT NULL,
  finished_at     DATETIME,
  users_processed INT          DEFAULT 0,
  matches_created INT          DEFAULT 0,
  emails_sent     INT          DEFAULT 0,
  status          VARCHAR(50)  NOT NULL DEFAULT 'running',
  error_message   TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
