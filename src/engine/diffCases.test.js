import { describe, it, expect } from 'vitest';
import { diffCases } from './diffCases.js';

const mdCase = (overrides = {}) => ({
  id: 'TC-X-01',
  family: 'X',
  title: 'case',
  preconditions: 'none',
  steps: 'do it',
  expected: 'ok',
  priority: 'P1',
  ...overrides,
});

const dbCase = (overrides = {}) => ({
  ...mdCase(),
  source: 'markdown',
  removed_from_md: 0,
  plan_id: 'plan-1',
  ...overrides,
});

describe('diffCases', () => {
  it('returns all cases as added when DB is empty', () => {
    const { added, changed, removed } = diffCases([], [mdCase(), mdCase({ id: 'TC-X-02' })]);
    expect(added).toHaveLength(2);
    expect(changed).toEqual([]);
    expect(removed).toEqual([]);
  });

  it('detects a changed field', () => {
    const db = [dbCase({ title: 'old title' })];
    const md = [mdCase({ title: 'new title' })];
    const { changed } = diffCases(db, md);
    expect(changed).toHaveLength(1);
    expect(changed[0].fields).toEqual([{ field: 'title', old: 'old title', new: 'new title' }]);
  });

  it('emits multiple field changes for the same case', () => {
    const db = [dbCase({ title: 'a', priority: 'P3' })];
    const md = [mdCase({ title: 'b', priority: 'P1' })];
    const { changed } = diffCases(db, md);
    expect(changed[0].fields.map((f) => f.field).sort()).toEqual(['priority', 'title']);
  });

  it('ignores whitespace-only differences', () => {
    const db = [dbCase({ steps: 'do it' })];
    const md = [mdCase({ steps: '  do it  ' })];
    expect(diffCases(db, md).changed).toEqual([]);
  });

  it('treats null and empty string as equal', () => {
    const db = [dbCase({ preconditions: null })];
    const md = [mdCase({ preconditions: '' })];
    expect(diffCases(db, md).changed).toEqual([]);
  });

  it('flags a case as removed when DB has it (markdown source) but MD does not', () => {
    const db = [dbCase({ id: 'TC-GONE-01' })];
    const { removed } = diffCases(db, []);
    expect(removed.map((c) => c.id)).toEqual(['TC-GONE-01']);
  });

  it('never flags a manual case as removed', () => {
    const db = [dbCase({ id: 'TC-MAN-99', source: 'manual' })];
    const { removed } = diffCases(db, []);
    expect(removed).toEqual([]);
  });

  it('does not flag a case that is already removed_from_md as removed again', () => {
    const db = [dbCase({ id: 'TC-GHOST-01', removed_from_md: 1 })];
    const { removed } = diffCases(db, []);
    expect(removed).toEqual([]);
  });

  it('marks a re-appearing removed_from_md case as changed with restored: true', () => {
    const db = [dbCase({ id: 'TC-BACK-01', removed_from_md: 1 })];
    const md = [mdCase({ id: 'TC-BACK-01' })];
    const { added, changed } = diffCases(db, md);
    expect(added).toEqual([]);
    expect(changed).toHaveLength(1);
    expect(changed[0].restored).toBe(true);
  });

  it('combines restored: true with field changes when both apply', () => {
    const db = [dbCase({ id: 'TC-BACK-02', removed_from_md: 1, title: 'old' })];
    const md = [mdCase({ id: 'TC-BACK-02', title: 'new' })];
    const { changed } = diffCases(db, md);
    expect(changed[0].restored).toBe(true);
    expect(changed[0].fields).toEqual([{ field: 'title', old: 'old', new: 'new' }]);
  });

  it('handles a full mixed delta in one call', () => {
    const db = [
      dbCase({ id: 'TC-A-01' }),                           // unchanged
      dbCase({ id: 'TC-A-02', title: 'v1' }),              // will change
      dbCase({ id: 'TC-A-03' }),                           // will be removed
      dbCase({ id: 'TC-A-99', source: 'manual' }),         // manual, ignored
    ];
    const md = [
      mdCase({ id: 'TC-A-01' }),
      mdCase({ id: 'TC-A-02', title: 'v2' }),
      mdCase({ id: 'TC-A-04' }),                           // new
    ];
    const { added, changed, removed } = diffCases(db, md);
    expect(added.map((c) => c.id)).toEqual(['TC-A-04']);
    expect(changed.map((c) => c.id)).toEqual(['TC-A-02']);
    expect(removed.map((c) => c.id)).toEqual(['TC-A-03']);
  });
});
