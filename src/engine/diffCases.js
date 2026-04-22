/**
 * Compare cases stored in DB (for a given plan) with cases extracted from a
 * freshly-parsed markdown import. Returns `{ added, changed, removed }`.
 *
 * Contract:
 *  - `added`   : case is in the MD but not in DB.
 *  - `changed` : case exists in both; emits per-field before/after for
 *                title, preconditions, steps, expected, priority, family.
 *  - `removed` : case is in DB with source='markdown' and absent from the MD.
 *                Manual cases (source='manual') are never flagged as removed.
 *
 * NOTE: stub for Phase 1. Real implementation + tests land in Phase 5.
 */
export function diffCases(/* dbCases, mdCases */) {
  throw new Error('diffCases: not yet implemented (Phase 5)');
}
