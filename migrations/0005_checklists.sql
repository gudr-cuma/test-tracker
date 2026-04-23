-- Checklist séquentielle optionnelle attachée à un cas.
-- Chaque item dépend du précédent ; un run peut pointer l'item en cours / bloquant.

CREATE TABLE case_checklist_items (
  id         TEXT PRIMARY KEY,
  plan_id    TEXT NOT NULL,
  case_id    TEXT NOT NULL,
  position   INTEGER NOT NULL,
  label      TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (plan_id, case_id) REFERENCES cases(plan_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_ccl_case ON case_checklist_items(plan_id, case_id, position);

ALTER TABLE runs ADD COLUMN checklist_item_id TEXT
  REFERENCES case_checklist_items(id) ON DELETE SET NULL;
