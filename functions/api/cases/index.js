import { json, error, methodNotAllowed, readJson, now } from '../../_lib/http.js';

const EDITABLE_FIELDS = ['family', 'title', 'preconditions', 'steps', 'expected', 'priority'];

async function listCases(context) {
  const url = new URL(context.request.url);
  const planId = url.searchParams.get('plan');
  if (!planId) return error(400, 'query param `plan` is required');

  const { results } = await context.env.DB
    .prepare(
      `SELECT
        c.id, c.plan_id, c.family, c.title, c.preconditions, c.steps,
        c.expected, c.priority, c.source, c.removed_from_md,
        c.created_at, c.updated_at,
        (SELECT COUNT(*) FROM runs r WHERE r.plan_id = c.plan_id AND r.case_id = c.id) AS run_count,
        (SELECT r.status FROM runs r
          WHERE r.plan_id = c.plan_id AND r.case_id = c.id
          ORDER BY COALESCE(r.updated_at, r.created_at) DESC LIMIT 1) AS latest_status,
        (SELECT COUNT(*) FROM runs r
          WHERE r.plan_id = c.plan_id AND r.case_id = c.id AND r.status = 'bug') AS bug_count
      FROM cases c
      WHERE c.plan_id = ?
      ORDER BY c.family, c.id`,
    )
    .bind(planId)
    .all();

  return json({ cases: results });
}

async function createCase(context) {
  const body = await readJson(context.request);
  if (!body) return error(400, 'invalid JSON body');

  const { plan_id, id, family, title, preconditions, steps, expected, priority } = body;
  if (!plan_id || !id || !title) {
    return error(400, 'plan_id, id and title are required');
  }
  if (!/^TC-[A-Z]+-\d+$/.test(id)) {
    return error(400, 'id must match /^TC-[A-Z]+-\\d+$/');
  }

  const plan = await context.env.DB
    .prepare('SELECT id FROM plans WHERE id = ? AND archived = 0')
    .bind(plan_id).first();
  if (!plan) return error(404, 'plan not found');

  const existing = await context.env.DB
    .prepare('SELECT id FROM cases WHERE plan_id = ? AND id = ?')
    .bind(plan_id, id).first();
  if (existing) return error(409, `case ${id} already exists in this plan`);

  const ts = now();
  await context.env.DB
    .prepare(
      `INSERT INTO cases
        (id, plan_id, family, title, preconditions, steps, expected, priority,
         source, removed_from_md, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual', 0, ?, ?)`,
    )
    .bind(
      id, plan_id,
      family || id.match(/^TC-([A-Z]+)-/)[1],
      title,
      preconditions || null,
      steps || null,
      expected || null,
      priority || null,
      ts, ts,
    )
    .run();

  return json({ case: { id, plan_id, family, title, preconditions, steps, expected, priority, source: 'manual' } }, { status: 201 });
}

export async function onRequest(context) {
  switch (context.request.method) {
    case 'GET':  return listCases(context);
    case 'POST': return createCase(context);
    default:     return methodNotAllowed(['GET', 'POST']);
  }
}

export { EDITABLE_FIELDS };
