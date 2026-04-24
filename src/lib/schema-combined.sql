-- Contract Finder – Combined Schema (ALL tables)
-- Paste this into phpMyAdmin SQL tab and click "Go"

-- ══════════════════════════════════════
-- Initial Phase: Jobs + Fetch Logs
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS jobs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  external_id     VARCHAR(255)   NOT NULL,
  source          VARCHAR(50)    NOT NULL DEFAULT 'adzuna',
  title           VARCHAR(500)   NOT NULL,
  company         VARCHAR(500),
  location        VARCHAR(500),
  description     TEXT,
  salary_min      DECIMAL(10,2),
  salary_max      DECIMAL(10,2),
  salary_currency VARCHAR(10)    DEFAULT 'GBP',
  contract_type   VARCHAR(100),
  redirect_url    VARCHAR(2000),
  posted_at       DATETIME,
  fetched_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  raw_json        JSON,

  UNIQUE KEY uq_source_external_id (source, external_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fetch_logs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  started_at      DATETIME       NOT NULL,
  finished_at     DATETIME,
  source          VARCHAR(50)    NOT NULL DEFAULT 'adzuna',
  jobs_fetched    INT            DEFAULT 0,
  jobs_new        INT            DEFAULT 0,
  jobs_duplicate  INT            DEFAULT 0,
  status          VARCHAR(50)    NOT NULL DEFAULT 'running',
  error_message   TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════
-- Phase 0: Users, Sessions, Profiles
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_admin      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id            VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  user_id       VARCHAR(36)  NOT NULL,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  expires_at    DATETIME     NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profiles (
  id                       INT AUTO_INCREMENT PRIMARY KEY,
  user_id                  VARCHAR(36)  NOT NULL UNIQUE,
  skills                   TEXT         COMMENT 'Comma-separated tech skills',
  min_rate                 INT          COMMENT 'Minimum daily rate in GBP',
  max_rate                 INT          COMMENT 'Maximum daily rate in GBP',
  location                 VARCHAR(255) COMMENT 'City/country preference',
  remote_preference        VARCHAR(50)  COMMENT 'remote, hybrid, onsite, any',
  contract_length          VARCHAR(100) COMMENT 'Preferred contract length',
  search_fingerprint       VARCHAR(64)  COMMENT 'SHA256 hash of preferences',
  contract_finder_enabled  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════
-- Phase 1: Matched Jobs, Notifications, Match Logs
-- ══════════════════════════════════════

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

CREATE TABLE IF NOT EXISTS matched_jobs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         VARCHAR(36)  NOT NULL,
  job_id          INT          NOT NULL,
  score           INT          NOT NULL DEFAULT 0  COMMENT 'Relevance score 0-100',
  matched_skills  TEXT         COMMENT 'Comma-separated skills that matched',
  status          VARCHAR(20)  NOT NULL DEFAULT 'new' COMMENT 'new, viewed, saved, dismissed, applied, deleted',
  notified        BOOLEAN      NOT NULL DEFAULT FALSE COMMENT 'Email sent?',
  match_log_id    INT          DEFAULT NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_user_job (user_id, job_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id)  REFERENCES jobs(id)  ON DELETE CASCADE,
  FOREIGN KEY (match_log_id) REFERENCES match_logs(id) ON DELETE SET NULL,

  INDEX idx_user_status (user_id, status),
  INDEX idx_user_score  (user_id, score DESC),
  INDEX idx_match_log_id (match_log_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- ══════════════════════════════════════
-- Frontend Phase: Saved Searches
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS saved_searches (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         VARCHAR(36)  NOT NULL,
  name            VARCHAR(255) NOT NULL DEFAULT 'Default',
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE COMMENT 'Active search receives notifications',
  filters         JSON         NOT NULL COMMENT 'Filter configuration object',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_active (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════
-- Phase 2: CV Files + Applications
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS cv_files (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         VARCHAR(36)  NOT NULL,
  original_name   VARCHAR(255) NOT NULL COMMENT 'Original filename',
  stored_path     VARCHAR(500) NOT NULL COMMENT 'Path on disk',
  file_size       INT          NOT NULL COMMENT 'Size in bytes',
  mime_type       VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE COMMENT 'Only one active CV per user',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_active_cv (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS applications (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           VARCHAR(36)  NOT NULL,
  job_id            INT          NOT NULL,
  match_id          INT          NOT NULL,
  cv_file_id        INT          NOT NULL,
  status            VARCHAR(30)  NOT NULL DEFAULT 'draft' COMMENT 'draft, sent, failed',
  applied_via       VARCHAR(50)  NOT NULL DEFAULT 'email' COMMENT 'email, manual, external_link',
  application_email VARCHAR(255) COMMENT 'Where the CV was sent (if email)',
  error_message     TEXT         COMMENT 'If sending failed',
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_user_job_app (user_id, job_id),
  FOREIGN KEY (user_id)    REFERENCES users(id)        ON DELETE CASCADE,
  FOREIGN KEY (job_id)     REFERENCES jobs(id)         ON DELETE CASCADE,
  FOREIGN KEY (match_id)   REFERENCES matched_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (cv_file_id) REFERENCES cv_files(id)     ON DELETE CASCADE,

  INDEX idx_user_status_app (user_id, status),
  INDEX idx_user_created_app (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
