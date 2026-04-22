-- Test Tracker initial schema
-- D1 = SQLite. All timestamps stored as ISO-8601 strings.

CREATE TABLE plans (
  id               TEXT PRIMARY KEY,
  title            TEXT NOT NULL,
  md_filename      TEXT,
  md_content       TEXT,
  last_imported_at TEXT,
  archived         INTEGER DEFAULT 0,
  created_at       TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at       TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plan_versions (
  id          TEXT PRIMARY KEY,
  plan_id     TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  md_content  TEXT NOT NULL,
  imported_at TEXT DEFAULT CURRENT_TIMESTAMP,
  summary     TEXT
);

CREATE TABLE testers (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE,
  active     INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cases (
  id              TEXT NOT NULL,
  plan_id         TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  family          TEXT,
  title           TEXT NOT NULL,
  preconditions   TEXT,
  steps           TEXT,
  expected        TEXT,
  priority        TEXT,
  source          TEXT NOT NULL DEFAULT 'markdown',
  removed_from_md INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at      TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (plan_id, id)
);

CREATE TABLE runs (
  id           TEXT PRIMARY KEY,
  plan_id      TEXT NOT NULL,
  case_id      TEXT NOT NULL,
  tester_id    TEXT REFERENCES testers(id),
  status       TEXT NOT NULL,
  started_at   TEXT,
  completed_at TEXT,
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at   TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id, case_id) REFERENCES cases(plan_id, id) ON DELETE CASCADE
);

CREATE TABLE comments (
  id          TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  author_id   TEXT REFERENCES testers(id),
  body        TEXT NOT NULL,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE case_changes (
  id              TEXT PRIMARY KEY,
  plan_id         TEXT NOT NULL,
  case_id         TEXT NOT NULL,
  plan_version_id TEXT REFERENCES plan_versions(id),
  change_type     TEXT NOT NULL,
  field           TEXT,
  old_value       TEXT,
  new_value       TEXT,
  changed_at      TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cases_plan      ON cases(plan_id);
CREATE INDEX idx_runs_case       ON runs(plan_id, case_id);
CREATE INDEX idx_runs_tester     ON runs(tester_id);
CREATE INDEX idx_comments_target ON comments(target_type, target_id);
CREATE INDEX idx_changes_case    ON case_changes(plan_id, case_id);
CREATE INDEX idx_versions_plan   ON plan_versions(plan_id);
