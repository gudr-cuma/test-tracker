import { json, error, methodNotAllowed, readJson, uuid, now } from '../../_lib/http.js';

const VALID_STATUSES = new Set([
  'a-faire', 'en-cours', 'fait', 'bug', 'en-pause', 'clos',
]);

async function listRuns(context) {
  const url = new URL(context.request.url);
  const planId = url.searchParams.get('plan');
  const caseId = url.searchParams.get('case');
  if (!planId || !caseId) return error(400, 'query params `plan` and `case` are required');

  const { results } = await context.env.DB
    .prepare(
      `SELECT r.*, t.name AS tester_name
       FROM runs r
       LEFT JOIN testers t ON t.id = r.tester_id
       WHERE r.plan_id = ? AND r.case_id = ?
       ORDER BY COALESCE(r.updated_at, r.created_at) DESC`,
    )
    .bind(planId, caseId).all();

  return json({ runs: results });
}

async function createRun(context) {
  const body = await readJson(context.request);
  if (!body) return error(400, 'invalid JSON body');

  const { plan_id, case_id, status = 'a-faire', tester_id } = body;
  if (!plan_id || !case_id) return error(400, 'plan_id and case_id are required');
  if (!VALID_STATUSES.has(status)) return error(400, `invalid status "${status}"`);

  const theCase = await context.env.DB
    .prepare('SELECT id FROM cases WHERE plan_id = ? AND id = ?')
    .bind(plan_id, case_id).first();
  if (!theCase) return error(404, 'case not found');

  const effectiveTester = tester_id || (context.data.tester ? context.data.tester.id : null);

  const id = uuid();
  const ts = now();
  const startedAt = status === 'en-cours' ? ts : null;
  const completedAt = status === 'fait' || status === 'clos' ? ts : null;

  await context.env.DB
    .prepare(
      `INSERT INTO runs
        (id, plan_id, case_id, tester_id, status, started_at, completed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, plan_id, case_id, effectiveTester, status, startedAt, completedAt, ts, ts)
    .run();

  const run = await context.env.DB
    .prepare('SELECT * FROM runs WHERE id = ?')
    .bind(id).first();
  return json({ run }, { status: 201 });
}

export async function onRequest(context) {
  switch (context.request.method) {
    case 'GET':  return listRuns(context);
    case 'POST': return createRun(context);
    default:     return methodNotAllowed(['GET', 'POST']);
  }
}

export { VALID_STATUSES };
