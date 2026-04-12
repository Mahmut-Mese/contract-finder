-- Contract Finder – Phase 2 schema
-- Run this against the existing contract_finder database.

USE contract_finder;

-- ── CV files: store uploaded CVs per user ──
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
  INDEX idx_user_active (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Applications: track job applications ──
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

  UNIQUE KEY uq_user_job (user_id, job_id),
  FOREIGN KEY (user_id)    REFERENCES users(id)        ON DELETE CASCADE,
  FOREIGN KEY (job_id)     REFERENCES jobs(id)         ON DELETE CASCADE,
  FOREIGN KEY (match_id)   REFERENCES matched_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (cv_file_id) REFERENCES cv_files(id)     ON DELETE CASCADE,

  INDEX idx_user_status (user_id, status),
  INDEX idx_user_created (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Add 'applied' to matched_jobs status if needed ──
-- Status is VARCHAR(20) so 'applied' already fits. No ALTER needed.
