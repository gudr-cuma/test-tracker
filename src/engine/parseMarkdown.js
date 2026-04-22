const CASE_ID_RE = /^TC-[A-Z]+-\d+$/;
const FAMILY_HEADING_RE = /^#{2,4}\s+.*?TC-([A-Z]+)/;
const HEADING_RE = /^#{1,6}\s/;
const SEPARATOR_CELL_RE = /^:?-+:?$/;

function splitRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  const inner = trimmed.slice(1, -1);

  const cells = [];
  let buf = '';
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '\\' && inner[i + 1] === '|') {
      buf += '|';
      i++;
      continue;
    }
    if (ch === '|') {
      cells.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  cells.push(buf.trim());
  return cells;
}

function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((c) => SEPARATOR_CELL_RE.test(c));
}

/**
 * Parse a test-plan markdown document into a canonical shape.
 *
 * Contract:
 *  - First `# ` heading becomes `plan.title`.
 *  - Any `### ... TC-<FAMILY>-<N> ...` heading switches the current family.
 *    If no family heading precedes a row, the family is inferred from the case
 *    ID itself.
 *  - Cases are rows of a 6-column pipe table:
 *      | ID | Titre | Préconditions | Étapes | Résultat attendu | Priorité |
 *    where ID matches /^TC-[A-Z]+-\d+$/.
 *  - Separator rows (|---|---|) and header rows (first cell not a TC-ID) are
 *    ignored. Non-table content is ignored.
 *
 * Throws on: missing title, duplicate IDs, table rows whose first cell looks
 * like a case ID but the row doesn't have exactly 6 cells, invalid ID format.
 *
 * @param {string} md  Raw markdown source.
 * @returns {{ title: string, cases: Array<{
 *   id: string, family: string, title: string,
 *   preconditions: string, steps: string, expected: string, priority: string
 * }> }}
 */
export function parseMarkdown(md) {
  if (typeof md !== 'string') {
    throw new Error('parseMarkdown: expected a string input');
  }

  const lines = md.split(/\r?\n/);
  let title = null;
  let currentFamily = null;
  const cases = [];
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!title && /^#\s+/.test(trimmed)) {
      title = trimmed.replace(/^#\s+/, '').trim();
      continue;
    }

    const familyMatch = trimmed.match(FAMILY_HEADING_RE);
    if (familyMatch) {
      currentFamily = familyMatch[1];
      continue;
    }

    if (HEADING_RE.test(trimmed)) {
      continue;
    }

    const cells = splitRow(trimmed);
    if (!cells) continue;
    if (isSeparatorRow(cells)) continue;

    const first = cells[0];
    if (!first || !CASE_ID_RE.test(first)) {
      continue;
    }

    if (cells.length !== 6) {
      throw new Error(
        `parseMarkdown: row for case "${first}" has ${cells.length} columns, expected 6`,
      );
    }

    if (seen.has(first)) {
      throw new Error(`parseMarkdown: duplicate case ID "${first}"`);
    }
    seen.add(first);

    const [id, caseTitle, preconditions, steps, expected, priority] = cells;
    const family = currentFamily || id.match(/^TC-([A-Z]+)-/)[1];

    cases.push({
      id,
      family,
      title: caseTitle,
      preconditions,
      steps,
      expected,
      priority,
    });
  }

  if (!title) {
    throw new Error('parseMarkdown: no plan title (# heading) found');
  }

  return { title, cases };
}
