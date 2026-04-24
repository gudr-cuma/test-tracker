-- Intervalles de temps pass� sur chaque run.
-- Un intervalle actif est caract�ris� par ended_at IS NULL.
-- Invariant : au plus un intervalle ouvert par run � tout instant.

CREATE TABLE run_time_intervals (
  id             TEXT PRIMARY KEY,
  run_id         TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  user_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
  started_at     TEXT NOT NULL,
  ended_at       TEXT,
  last_ping_at   TEXT NOT NULL,
  closed_reason  TEXT
);

CREATE INDEX idx_rti_run  ON run_time_intervals(run_id);
CREATE INDEX idx_rti_open ON run_time_intervals(run_id) WHERE ended_at IS NULL;
CREATE INDEX idx_rti_user ON run_time_intervals(user_id);
