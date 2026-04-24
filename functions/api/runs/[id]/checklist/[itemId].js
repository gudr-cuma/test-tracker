import { json, error, methodNotAllowed, readJson, now } from '../../../../_lib/http.js';
import { closeOpenInterval, gcStaleIntervals } from '../../../../_lib/runTimer.js';

/**
 * PUT /api/runs/:id/checklist/:itemId
 * Body: { result: 'ok' | 'nok' | null, url?: string | null }
 *
 * - result=null supprime la ligne (revient à "non évalué").
 * - Si tous les items de la checklist du cas sont 'ok' après l'opération,
 *   le run passe automatiquement à status='fait', started_at / completed_at
 *   sont horodatés si nécessaire, et l'intervalle de temps ouvert est clôturé.
 */
async function putChecklistResult(context) {
  const { id: runId, itemId } = context.params;
  const body = await readJson(context.request);
  if (!body || typeof body !== 'object') return error(400, 'invalid JSON body');

  const { result, url } = body;
  if (result != null && result !== 'ok' && result !== 'nok') {
    return error(400, "result must be 'ok', 'nok' or null");
  }

  const run = await context.env.DB
    .prepare('SELECT id, plan_id, case_id, status, started_at, completed_at FROM runs WHERE id = ?')
    .bind(runId).first();
  if (!run) return error(404, 'run not found');

  const item = await context.env.DB
    .prepare('SELECT id FROM case_checklist_items WHERE id = ? AND plan_id = ? AND case_id = ?')
    .bind(itemId, run.plan_id, run.case_id).first();
  if (!item) return error(400, "checklist item does not belong to this run's case");

  const userId = context.data.user?.id || null;
  const ts = now();

  if (result == null) {
    await context.env.DB
      .prepare('DELETE FROM run_checklist_results WHERE run_id = ? AND item_id = ?')
      .bind(runId, itemId).run();
  } else {
    await context.env.DB
      .prepare(
        `INSERT INTO run_checklist_results (run_id, item_id, result, url, updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(run_id, item_id) DO UPDATE SET
           result = excluded.result,
           url = excluded.url,
           updated_at = excluded.updated_at,
           updated_by = excluded.updated_by`,
      )
      .bind(runId, itemId, result, url ? String(url).trim() || null : null, ts, userId)
      .run();
  }

  // Si un résultat est renseigné et que le run n'est pas encore démarré → en-cours
  let nextStatus = run.status;
  const sets = ['updated_at = ?'];
  const values = [ts];
  if (result != null && run.status === 'a-faire') {
    nextStatus = 'en-cours';
    sets.push('status = ?');
    values.push('en-cours');
    if (!run.started_at) { sets.push('started_at = ?'); values.push(ts); }
  }

  // Auto-transition → 'fait' si tous les items sont OK.
  const totals = await context.env.DB
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM case_checklist_items WHERE plan_id = ? AND case_id = ?) AS total,
        (SELECT COUNT(*) FROM run_checklist_results WHERE run_id = ? AND result = 'ok') AS oks`,
    )
    .bind(run.plan_id, run.case_id, runId)
    .first();

  const allOk = totals && totals.total > 0 && totals.oks === totals.total;
  if (allOk && nextStatus !== 'fait' && nextStatus !== 'clos') {
    nextStatus = 'fait';
    sets.push('status = ?');
    values.push('fait');
    if (!run.completed_at) { sets.push('completed_at = ?'); values.push(ts); }
  }

  values.push(runId);
  await context.env.DB
    .prepare(`UPDATE runs SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...values).run();

  await gcStaleIntervals(context.env.DB, runId);
  if (nextStatus === 'fait' || nextStatus === 'clos' || nextStatus === 'en-pause') {
    await closeOpenInterval(context.env.DB, runId, 'status');
  }

  return json({ ok: true, status: nextStatus, all_ok: allOk });
}

export async function onRequest(context) {
  if (context.request.method !== 'PUT') return methodNotAllowed(['PUT']);
  return putChecklistResult(context);
}
