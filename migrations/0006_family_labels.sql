-- Libellés optionnels par famille de cas, rattachés à un plan.
CREATE TABLE plan_families (
  plan_id TEXT NOT NULL,
  family  TEXT NOT NULL,
  label   TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (plan_id, family),
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);
