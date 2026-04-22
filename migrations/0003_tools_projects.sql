CREATE TABLE tools (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  icon       TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  tool_id    TEXT REFERENCES tools(id) ON DELETE SET NULL,
  color      TEXT NOT NULL,
  icon       TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE plans ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE plans ADD COLUMN color TEXT;
ALTER TABLE plans ADD COLUMN icon TEXT;

CREATE INDEX idx_projects_tool ON projects(tool_id);
CREATE INDEX idx_plans_project  ON plans(project_id);
