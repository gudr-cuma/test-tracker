-- R�sultats de la checklist par run : une ligne (run, item) avec OK/NOK + URL optionnelle.
-- Remplace progressivement runs.checklist_item_id (qui reste pour compat lecture).

CREATE TABLE run_checklist_results (
  run_id      TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  item_id     TEXT NOT NULL REFERENCES case_checklist_items(id) ON DELETE CASCADE,
  result      TEXT NOT NULL CHECK (result IN ('ok', 'nok')),
  url         TEXT,
  updated_at  TEXT,
  updated_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (run_id, item_id)
);

CREATE INDEX idx_rcr_run ON run_checklist_results(run_id);
