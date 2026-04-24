import { json, error, methodNotAllowed, readJson } from '../../../_lib/http.js';
import {
  closeOpenInterval, gcStaleIntervals, openInterval, pingInterval,
} from '../../../_lib/runTimer.js';

/**
 * POST /api/runs/:id/timer
 * Body: { action: 'start' | 'stop' | 'ping' }
 *
 * - start : ouvre un intervalle si aucun n'est déjà ouvert
 * - stop  : ferme l'intervalle ouvert avec closed_reason='manual'
 * - ping  : heartbeat, met à jour last_ping_at
 *
 * Réponse : { total_ms, running: boolean, open_started_at: string | null }
 */
async function postTimer(context) {
  const runId = context.params.id;
  const body = await readJson(context.request);
  if (!body || typeof body !== 'object') return error(400, 'invalid JSON body');

  const action = String(body.action || '');
  if (!['start', 'stop', 'ping'].includes(action)) {
    return error(400, "action must be one of 'start', 'stop', 'ping'");
  }

  const run = await context.env.DB
    .prepare('SELECT id, status FROM runs WHERE id = ?')
    .bind(runId).first();
  if (!run) return error(404, 'run not found');

  // Toujours nettoyer les intervalles orphelins d'abord.
  await gcStaleIntervals(context.env.DB, runId);

  const userId = context.data.user?.id || null;

  if (action === 'start') {
    // Refuser si statut final — on ne rouvre pas un timer sur un run clos.
    if (run.status === 'clos') return error(400, 'cannot start timer on a closed run');
    await openInterval(context.env.DB, runId, userId);
  } else if (action === 'stop') {
    await closeOpenInterval(context.env.DB, runId, 'manual');
  } else if (action === 'ping') {
    await pingInterval(context.env.DB, runId);
  }

  // Retour : total + état courant
  const totals = await context.env.DB
    .prepare(
      `SELECT
        COALESCE(SUM(
          (julianday(COALESCE(ended_at, 'now')) - julianday(started_at)) * 86400000
        ), 0) AS total_ms,
        (SELECT started_at FROM run_time_intervals
           WHERE run_id = ? AND ended_at IS NULL LIMIT 1) AS open_started_at
       FROM run_time_intervals
       WHERE run_id = ?`,
    )
    .bind(runId, runId).first();

  return json({
    total_ms: Math.round(totals?.total_ms || 0),
    running: Boolean(totals?.open_started_at),
    open_started_at: totals?.open_started_at || null,
  });
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') return methodNotAllowed(['POST']);
  return postTimer(context);
}
