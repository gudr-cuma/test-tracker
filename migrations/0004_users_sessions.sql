-- Migration 0004 : Users + Sessions (remplace l'auth Cloudflare Access)
-- Les users fusionnent avec la table testers (même entité).
-- La table testers reste pour la compatibilité des runs existants.

CREATE TABLE users (
  id                    TEXT PRIMARY KEY,
  email                 TEXT UNIQUE NOT NULL,
  name                  TEXT NOT NULL,
  password_hash         TEXT NOT NULL,
  is_active             INTEGER NOT NULL DEFAULT 1,
  is_admin              INTEGER NOT NULL DEFAULT 0,
  can_import            INTEGER NOT NULL DEFAULT 0,
  admin_plans           INTEGER NOT NULL DEFAULT 0,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until          TEXT,
  created_at            TEXT DEFAULT (datetime('now')),
  updated_at            TEXT DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  last_seen  TEXT DEFAULT (datetime('now')),
  ip_address TEXT,
  user_agent TEXT,
  is_revoked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_user    ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

ALTER TABLE plans ADD COLUMN owner_id TEXT REFERENCES users(id) ON DELETE SET NULL;
