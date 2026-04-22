import { json, error, methodNotAllowed, readJson, now } from '../../_lib/http.js';

const EDITABLE = ['family', 'title', 'preconditions', 'steps', 'expected', 'priority'];

async function patchCase(context) {
  const url = new URL(context.request.url);
  const planId = url.searchParams.get('plan');
  const caseId = context.params.id;
  if (!planId) return error(400, 'query param `plan` is required');

  const body = await readJson(context.request);
  if (!body || typeof body !== 'object') return error(400, 'invalid JSON body');

  const sets = [];
  const values = [];
  for (const field of EDITABLE) {
    if (field in body) {
      sets.push(`${field} = ?`);
      values.push(body[field]);
    }
  }
  if (sets.length === 0) return error(400, 'no editable fields in body');

  sets.push('updated_at = ?');
  values.push(now());
  values.push(planId, caseId);

  const res = await context.env.DB
    .prepare(`UPDATE cases SET ${sets.join(', ')} WHERE plan_id = ? AND id = ?`)
    .bind(...values)
    .run();

  if (!res.meta || res.meta.changes === 0) return error(404, 'case not found');

  const updated = await context.env.DB
    .prepare('SELECT * FROM cases WHERE plan_id = ? AND id = ?')
    .bind(planId, caseId).first();
  return json({ case: updated });
}

export async function onRequest(context) {
  if (context.request.method !== 'PATCH') return methodNotAllowed(['PATCH']);
  return patchCase(context);
}
