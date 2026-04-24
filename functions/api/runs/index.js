import { json, error, methodNotAllowed, readJson, uuid, now } from '../../_lib/http.js';
import { gcStaleIntervals, openInterval } from '../../_lib/runTimer.js';

const VALID_STATUSES = new Set([
  'a-faire', 'en-cours', 'fait', 'bug', 'evolution', 'en-pause', 'clos',
]);

// Statuts qui NE démarrent PAS un timer à la création d'un run.
const NON_ACTIVE_STATUSES = new Set(['fait', 'clos', 'en-pause']);

async function listRuns(context) {
  const url = new URL(context.request.url);
  const planId = url.searchParams.get('plan');
  const caseId = url.searchParams.get('case');
  if (!planId || !caseId) return error(400, 'query params `plan` and `case` are required');

  // GC des intervalles orphelins pour tous les runs concernés AVANT lecture.
  // (On le fait via un UPDATE global sur le sous-ensemble au lieu d'un appel par run.)
  await context.env.DB
    .prepare(
      `UPDATE run_time_intervals
         SET ended_at = last_ping_at, closed_reason = 'heartbeat_timeout'
       WHERE ended_at IS NULL
         AND (julianday('now') - julianday(last_ping_at)) * 86400 > 120
         AND run_id IN (SELECT id FROM runs WHERE plan_id = ? AND case_id = ?)`,
    )
    .bind(planId, caseId).run();

  // Requête principale : runs + totaux temps + tableau de résultats checklist.
  // La sous-requête JSON pour les résultats peut échouer si la table n'existe
  // pas encore → fallback sans.
  let results;
  try {
    ({ results } = await context.env.DB
      .prepare(
        `SELECT r.*, t.name AS tester_name,
                ci.position AS checklist_item_position,
                ci.label    AS checklist_item_label,
                (SELECT COALESCE(SUM(
                          (julianday(COALESCE(rti.ended_at, 'now')) - julianday(rti.started_at)) * 86400000
                        ), 0)
                 FROM run_time_intervals rti WHERE rti.run_id = r.id) AS total_ms,
                (SELECT started_at FROM run_time_intervals
                   WHERE run_id = r.id AND ended_at IS NULL LIMIT 1) AS open_started_at,
                (SELECT json_group_array(json_object(
                          'item_id', rcr.item_id,
                          'result',  rcr.result,
                          'url',     rcr.url,
                          'updated_at', rcr.updated_at
                        ))
                 FROM run_checklist_results rcr WHERE rcr.run_id = r.id) AS checklist_results_json
         FROM runs r
         LEFT JOIN testers t ON t.id = r.tester_id
         LEFT JOIN case_checklist_items ci ON ci.id = r.checklist_item_id
         WHERE r.plan_id = ? AND r.case_id = ?
         ORDER BY COALESCE(r.updated_at, r.created_at) DESC`,
      )
      .bind(planId, caseId).all());
  } catch {
    ({ results } = await context.env.DB
      .prepare(
        `SELECT r.*, t.name AS tester_name,
                ci.position AS checklist_item_position,
                ci.label    AS checklist_item_label,
                0 AS total_ms, NULL AS open_started_at, '[]' AS checklist_results_json
         FROM runs r
         LEFT JOIN testers t ON t.id = r.tester_id
         LEFT JOIN case_checklist_items ci ON ci.id = r.checklist_item_id
         WHERE r.plan_id = ? AND r.case_id = ?
         ORDER BY COALESCE(r.updated_at, r.created_at) DESC`,
      )
      .bind(planId, caseId).all());
  }

  // Décoder les résultats JSON en tableau.
  const runs = results.map((r) => {
    let checklist_results = [];
    try { checklist_results = r.checklist_results_json ? JSON.parse(r.checklist_results_json) : []; } catch { /* noop */ }
    return {
      ...r,
      total_ms: Math.round(r.total_ms || 0),
      running: Boolean(r.open_started_at),
      checklist_results,
    };
  });

  return json({ runs });
}

async function createRun(context) {
  const body = await readJson(context.request);
  if (!body) return error(400, 'invalid JSON body');

  const { plan_id, case_id, status = 'a-faire', tester_id, checklist_item_id } = body;
  if (!plan_id || !case_id) return error(400, 'plan_id and case_id are required');
  if (!VALID_STATUSES.has(status)) return error(400, `invalid status "${status}"`);

  const theCase = await context.env.DB
    .prepare('SELECT id FROM cases WHERE plan_id = ? AND id = ?')
    .bind(plan_id, case_id).first();
  if (!theCase) return error(404, 'case not found');

  if (checklist_item_id) {
    const item = await context.env.DB
      .prepare('SELECT id FROM case_checklist_items WHERE id = ? AND plan_id = ? AND case_id = ?')
      .bind(checklist_item_id, plan_id, case_id).first();
    if (!item) return error(400, 'checklist_item_id does not belong to this case');
  }

  const effectiveTester = tester_id || (context.data.tester ? context.data.tester.id : null);
  const userId = context.data.user?.id || null;

  const id = uuid();
  const ts = now();
  const startedAt = status === 'en-cours' ? ts : null;
  const completedAt = status === 'fait' || status === 'clos' ? ts : null;

  await context.env.DB
    .prepare(
      `INSERT INTO runs
        (id, plan_id, case_id, tester_id, status, started_at, completed_at, created_at, updated_at, checklist_item_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, plan_id, case_id, effectiveTester, status, startedAt, completedAt, ts, ts, checklist_item_id || null)
    .run();

  // Ouvre un intervalle de temps sauf si le run naît déjà dans un statut inactif.
  if (!NON_ACTIVE_STATUSES.has(status)) {
    try { await openInterval(context.env.DB, id, userId); } catch { /* table absente si migration 0011 pas jouée */ }
  }

  const run = await context.env.DB
    .prepare('SELECT * FROM runs WHERE id = ?')
    .bind(id).first();
  return json({ run: { ...run, total_ms: 0, running: !NON_ACTIVE_STATUSES.has(status), checklist_results: [] } }, { status: 201 });
}

export async function onRequest(context) {
  switch (context.request.method) {
    case 'GET':  return listRuns(context);
    case 'POST': return createRun(context);
    default:     return methodNotAllowed(['GET', 'POST']);
  }
}

export { VALID_STATUSES, NON_ACTIVE_STATUSES };
