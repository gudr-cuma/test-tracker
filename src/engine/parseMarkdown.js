/**
 * Parse a test-plan markdown document into a canonical shape.
 * Contract:
 *  - First `# ` heading becomes `plan.title`.
 *  - Any `### ... TC-<FAMILY>-<N> ...` heading switches the current family.
 *  - Cases are rows of a 6-column pipe table:
 *      | ID | Titre | Préconditions | Étapes | Résultat attendu | Priorité |
 *    where ID matches /^TC-[A-Z]+-\d+$/.
 *  - Sections outside those tables are ignored.
 *
 * Throws on: duplicate IDs, table rows without a 6-column shape once an ID
 * row is detected, unknown heading priority formats.
 *
 * NOTE: this is a stub for Phase 1 — the real implementation lands in
 *       Phase 2 with a matching test suite against the Zeendoc reference.
 */
export function parseMarkdown(/* md */) {
  throw new Error('parseMarkdown: not yet implemented (Phase 2)');
}
