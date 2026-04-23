import { json, error, methodNotAllowed, readJson, uuid, now } from '../../_lib/http.js';

async function listItems(context) {
  const url = new URL(context.request.url);
  const planId = url.searchParams.get('plan');
  const caseId = url.searchParams.get('case');
  if (!planId || !caseId) return error(400, 'query params `plan` and `case` are required');

  const { results } = await context.env.DB
    .prepare(
      `SELECT id, plan_id, case_id, position, label, created_at, updated_at
       FROM case_checklist_items
       WHERE plan_id = ? AND case_id = ?
       ORDER BY position ASC`,
    )
    .bind(planId, caseId)
    .all();

  return json({ items: results });
}

async function createItem(context) {
  const body = await readJson(context.request);
  if (!body) return error(400, 'invalid JSON body');

  const url = new URL(context.request.url);
  const planId = url.searchParams.get('plan');
  const caseId = url.searchParams.get('case');
  if (!planId || !caseId) return error(400, 'query params `plan` and `case` are required');

  const label = String(body.label ?? '').trim();
  if (!label) return error(400, 'label is required');

  const caseRow = await context.env.DB
    .prepare('SELECT id FROM cases WHERE plan_id = ? AND id = ?')
    .bind(planId, caseId).first();
  if (!caseRow) return error(404, 'case not found');

  const { count } = await context.env.DB
    .prepare('SELECT COUNT(*) AS count FROM case_checklist_items WHERE plan_id = ? AND case_id = ?')
    .bind(planId, caseId).first();

  let position = Number.isInteger(body.position) ? body.position : count;
  if (position < 0) position = 0;
  if (position > count) position = count;

  const ts = now();
  const id = uuid();

  const statements = [];
  if (position < count) {
    statements.push(
      context.env.DB
        .prepare(`UPDATE case_checklist_items
                  SET position = position + 1, updated_at = ?
                  WHERE plan_id = ? AND case_id = ? AND position >= ?`)
        .bind(ts, planId, caseId, position),
    );
  }
  statements.push(
    context.env.DB
      .prepare(`INSERT INTO case_checklist_items
                  (id, plan_id, case_id, position, label, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, planId, caseId, position, label, ts, ts),
  );

  await context.env.DB.batch(statements);

  return json(
    { item: { id, plan_id: planId, case_id: caseId, position, label, created_at: ts, updated_at: ts } },
    { status: 201 },
  );
}

export async function onRequest(context) {
  switch (context.request.method) {
    case 'GET':  return listItems(context);
    case 'POST': return createItem(context);
    default:     return methodNotAllowed(['GET', 'POST']);
  }
}
