-- Contract Finder – Frontend Phase schema
-- Run this against the existing contract_finder database.

USE contract_finder;

-- 1. Link matches to their pipeline run
ALTER TABLE matched_jobs ADD COLUMN match_log_id INT DEFAULT NULL AFTER notified;
ALTER TABLE matched_jobs ADD INDEX idx_match_log_id (match_log_id);
ALTER TABLE matched_jobs ADD CONSTRAINT fk_matched_jobs_log
  FOREIGN KEY (match_log_id) REFERENCES match_logs(id) ON DELETE SET NULL;

-- Backfill: link existing matches to their actual log
-- All 196 current matches were created by log id 11
UPDATE matched_jobs SET match_log_id = 11 WHERE match_log_id IS NULL;

-- 2. Saved searches table
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
