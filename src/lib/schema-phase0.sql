-- Contract Finder – Phase 0 schema
-- Run this against the existing contract_finder database.

USE contract_finder;

-- ── Users table ──
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Sessions table (Auth.js database sessions) ──
CREATE TABLE IF NOT EXISTS sessions (
  id            VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  user_id       VARCHAR(36)  NOT NULL,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  expires_at    DATETIME     NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Profiles table ──
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
