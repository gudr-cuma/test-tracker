import { json, error, methodNotAllowed, readJson } from '../../../_lib/http.js';
import { parseMarkdown } from '../../../../src/engine/parseMarkdown.js';
import { diffCases } from '../../../../src/engine/diffCases.js';

export async function onRequest(context) {
  if (context.request.method !== 'POST') return methodNotAllowed(['POST']);

  if (!context.data.user?.can_import) {
    return error(403, 'Vous n\'avez pas le droit d\'importer un cahier de test');
  }

  const body = await readJson(context.request);
  if (!body) return error(400, 'invalid JSON body');
  const { md, filename, planId, cases: incomingCases, title: incomingTitle } = body;

  let parsed;
  if (incomingCases && Array.isArray(incomingCases)) {
    if (!incomingTitle || typeof incomingTitle !== 'string') {
      return error(400, '`title` est requis quand `cases` est fourni');
    }
    parsed = { title: incomingTitle, cases: incomingCases };
  } else {
    if (!md || typeof md !== 'string') return error(400, '`md` is required (string)');
    try {
      parsed = parseMarkdown(md);
    } catch (e) {
      return error(400, 'markdown parse error', String(e.message || e));
    }
  }

  // No planId → treat everything as new.
  if (!planId) {
    return json({
      mode: 'new-plan',
      parsed: { title: parsed.title, cases_count: parsed.cases.length, filename: filename || null },
      diff: { added: parsed.cases, changed: [], removed: [] },
    });
  }

  const plan = await context.env.DB
    .prepare('SELECT id, title FROM plans WHERE id = ? AND archived = 0')
    .bind(planId).first();
  if (!plan) return error(404, 'plan not found');

  const { results: dbCases } = await context.env.DB
    .prepare('SELECT * FROM cases WHERE plan_id = ?')
    .bind(planId).all();

  const { results: dbItems } = await context.env.DB
    .prepare(`SELECT case_id, position, label FROM case_checklist_items
              WHERE plan_id = ? ORDER BY case_id, position`)
    .bind(planId).all();

  const itemsByCase = new Map();
  for (const it of dbItems) {
    if (!itemsByCase.has(it.case_id)) itemsByCase.set(it.case_id, []);
    itemsByCase.get(it.case_id).push({ position: it.position, label: it.label });
  }
  for (const c of dbCases) c.checklist = itemsByCase.get(c.id) || [];

  const diff = diffCases(dbCases, parsed.cases);

  return json({
    mode: 'update-plan',
    plan,
    parsed: { title: parsed.title, cases_count: parsed.cases.length, filename: filename || null },
    diff,
  });
}
