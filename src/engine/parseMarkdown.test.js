import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseMarkdown } from './parseMarkdown.js';

const here = dirname(fileURLToPath(import.meta.url));
const samplePlan = readFileSync(
  join(here, '__fixtures__', 'sample_plan.md'),
  'utf8',
);

describe('parseMarkdown', () => {
  it('extracts the plan title from the first H1', () => {
    const { title } = parseMarkdown(samplePlan);
    expect(title).toBe('Cahier de test — Module démo');
  });

  it('extracts all cases across families', () => {
    const { cases } = parseMarkdown(samplePlan);
    expect(cases.map((c) => c.id)).toEqual([
      'TC-INIT-01',
      'TC-INIT-02',
      'TC-AUTH-01',
      'TC-AUTH-02',
    ]);
  });

  it('assigns family from preceding ### heading', () => {
    const { cases } = parseMarkdown(samplePlan);
    const init = cases.filter((c) => c.id.startsWith('TC-INIT-'));
    const auth = cases.filter((c) => c.id.startsWith('TC-AUTH-'));
    expect(init.every((c) => c.family === 'INIT')).toBe(true);
    expect(auth.every((c) => c.family === 'AUTH')).toBe(true);
  });

  it('preserves every case field', () => {
    const { cases } = parseMarkdown(samplePlan);
    const c = cases.find((x) => x.id === 'TC-INIT-01');
    expect(c).toEqual({
      id: 'TC-INIT-01',
      family: 'INIT',
      title: 'Premier lancement',
      preconditions: 'Aucune',
      steps: "Ouvrir l'appli",
      expected: "Page d'accueil visible",
      priority: 'P1',
    });
  });

  it('unescapes pipes inside cells', () => {
    const { cases } = parseMarkdown(samplePlan);
    const c = cases.find((x) => x.id === 'TC-AUTH-01');
    expect(c.steps).toBe('Saisir email | mot de passe');
  });

  it('preserves inline <br> markers verbatim (to be rendered later)', () => {
    const { cases } = parseMarkdown(samplePlan);
    const c = cases.find((x) => x.id === 'TC-AUTH-02');
    expect(c.steps).toContain('<br>');
  });

  it('falls back to ID-derived family when no heading precedes the table', () => {
    const md = `# Sample\n\n| ID | Titre | Préconditions | Étapes | Résultat attendu | Priorité |\n|---|---|---|---|---|---|\n| TC-LONE-01 | Solo | - | - | - | P3 |\n`;
    const { cases } = parseMarkdown(md);
    expect(cases[0].family).toBe('LONE');
  });

  it('throws on missing H1 title', () => {
    expect(() => parseMarkdown('no heading here')).toThrow(/no plan title/);
  });

  it('throws on duplicate case IDs', () => {
    const md = `# Dup\n\n| ID | Titre | Préconditions | Étapes | Résultat attendu | Priorité |\n|---|---|---|---|---|---|\n| TC-X-01 | a | - | - | - | P1 |\n| TC-X-01 | b | - | - | - | P1 |\n`;
    expect(() => parseMarkdown(md)).toThrow(/duplicate case ID "TC-X-01"/);
  });

  it('throws when a case row has fewer than 6 columns', () => {
    const md = `# Bad\n\n| TC-BAD-01 | missing cols | only 3 | here |\n`;
    expect(() => parseMarkdown(md)).toThrow(/has 4 columns, expected 6/);
  });

  it('ignores separator rows and non-ID rows (header)', () => {
    const md = `# H\n\n| ID | Titre | Préconditions | Étapes | Résultat attendu | Priorité |\n|---|---|---|---|---|---|\n| TC-Z-01 | t | - | - | - | P1 |\n`;
    const { cases } = parseMarkdown(md);
    expect(cases).toHaveLength(1);
    expect(cases[0].id).toBe('TC-Z-01');
  });

  it('returns an empty cases array when no table rows match', () => {
    const md = `# Empty\n\nJust text, no tables.`;
    const { cases } = parseMarkdown(md);
    expect(cases).toEqual([]);
  });

  it('rejects non-string input', () => {
    expect(() => parseMarkdown(null)).toThrow(/expected a string/);
  });
});
