-- Contract Finder – Initial Phase schema
-- Run this once against your MySQL database to set up tables.

CREATE DATABASE IF NOT EXISTS contract_finder
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE contract_finder;

-- ── Jobs table ──
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

-- ── Fetch logs table ──
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
