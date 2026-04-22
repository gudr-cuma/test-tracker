import { json, error, methodNotAllowed, readJson } from '../../../_lib/http.js';
import { parseMarkdown } from '../../../../src/engine/parseMarkdown.js';
import { diffCases } from '../../../../src/engine/diffCases.js';

export async function onRequest(context) {
  if (context.request.method !== 'POST') return methodNotAllowed(['POST']);

  const body = await readJson(context.request);
  if (!body) return error(400, 'invalid JSON body');
  const { md, filename, planId } = body;
  if (!md || typeof md !== 'string') return error(400, '`md` is required (string)');

  let parsed;
  try {
    parsed = parseMarkdown(md);
  } catch (e) {
    return error(400, 'markdown parse error', String(e.message || e));
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

  const diff = diffCases(dbCases, parsed.cases);

  return json({
    mode: 'update-plan',
    plan,
    parsed: { title: parsed.title, cases_count: parsed.cases.length, filename: filename || null },
    diff,
  });
}
