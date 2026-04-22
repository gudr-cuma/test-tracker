export const DIFFED_FIELDS = [
  'family',
  'title',
  'preconditions',
  'steps',
  'expected',
  'priority',
];

function normalize(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/**
 * Compare cases stored in DB for a given plan with cases extracted from a
 * freshly-parsed markdown. Returns `{ added, changed, removed }`.
 *
 *  - `added`    : case is in the MD but not in DB at all.
 *  - `changed`  : case exists in both; emits per-field before/after for the
 *                 fields in DIFFED_FIELDS. Also emits a `restored: true` flag
 *                 when the DB row had `removed_from_md = 1` (ID reappears).
 *  - `removed`  : case is in DB with `source = 'markdown'` and
 *                 `removed_from_md = 0`, but missing from the MD.
 *                 Manual cases (`source = 'manual'`) are never flagged.
 *
 * Pure function — easy to unit-test without DB.
 *
 * @param {Array} dbCases  rows from SELECT * FROM cases WHERE plan_id = ?
 * @param {Array} mdCases  parseMarkdown(md).cases
 * @returns {{added: Array, changed: Array, removed: Array}}
 */
export function diffCases(dbCases, mdCases) {
  const dbById = new Map(dbCases.map((c) => [c.id, c]));
  const mdById = new Map(mdCases.map((c) => [c.id, c]));

  const added = [];
  const changed = [];
  const removed = [];

  for (const md of mdCases) {
    const db = dbById.get(md.id);
    if (!db) {
      added.push(md);
      continue;
    }

    const fieldChanges = [];
    for (const f of DIFFED_FIELDS) {
      if (normalize(db[f]) !== normalize(md[f])) {
        fieldChanges.push({ field: f, old: db[f] ?? null, new: md[f] ?? null });
      }
    }

    const restored = Number(db.removed_from_md) === 1;

    if (fieldChanges.length > 0 || restored) {
      changed.push({
        id: md.id,
        current: db,
        incoming: md,
        fields: fieldChanges,
        restored,
      });
    }
  }

  for (const db of dbCases) {
    if (db.source !== 'markdown') continue;
    if (Number(db.removed_from_md) === 1) continue;
    if (!mdById.has(db.id)) removed.push(db);
  }

  return { added, changed, removed };
}
