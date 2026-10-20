-- SevaCoin backend schema (MySQL 8 / MariaDB 10.4+)
-- Run once:  mysql -u root -p < sql/schema.sql

CREATE DATABASE IF NOT EXISTS sevacoins
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sevacoins;

CREATE TABLE IF NOT EXISTS contact_messages (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(120)  NOT NULL,
  email        VARCHAR(190)  NOT NULL,
  subject      VARCHAR(200)  NOT NULL,
  message      TEXT          NOT NULL,
  ip_hash      CHAR(64)      NOT NULL,
  user_agent   VARCHAR(255)  NULL,
  status       ENUM('new','read','replied','spam') NOT NULL DEFAULT 'new',
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contact_status_created (status, created_at),
  KEY idx_contact_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscribers (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email           VARCHAR(190) NOT NULL,
  status          ENUM('active','unsubscribed') NOT NULL DEFAULT 'active',
  unsubscribe_token CHAR(64)   NOT NULL,
  ip_hash         CHAR(64)     NOT NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subscribers_email (email),
  UNIQUE KEY uq_subscribers_token (unsubscribe_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Simple rate limiting: one row per request, pruned automatically by the API.
CREATE TABLE IF NOT EXISTS rate_limits (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  bucket      VARCHAR(80)  NOT NULL,   -- e.g. "contact:<ip_hash>"
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rate_bucket_created (bucket, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
