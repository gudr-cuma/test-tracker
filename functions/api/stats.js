import { json, error, methodNotAllowed } from '../_lib/http.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') return methodNotAllowed(['GET']);

  const url = new URL(context.request.url);
  const planId = url.searchParams.get('plan');
  if (!planId) return error(400, 'query param `plan` is required');

  const db = context.env.DB;

  // 1. Current status per case = status of the latest run, or 'a-faire' if none
  //    and exclude cases flagged removed_from_md.
  //    We use a correlated subquery for portability (D1 supports it).
  const statusRows = await db
    .prepare(
      `SELECT
        c.id,
        c.family,
        COALESCE(
          (SELECT r.status FROM runs r
             WHERE r.plan_id = c.plan_id AND r.case_id = c.id
             ORDER BY COALESCE(r.updated_at, r.created_at) DESC LIMIT 1),
          'a-faire'
        ) AS current_status
       FROM cases c
       WHERE c.plan_id = ? AND c.removed_from_md = 0`,
    )
    .bind(planId).all();

  const byStatus = {};
  const byFamily = {};
  for (const row of statusRows.results) {
    byStatus[row.current_status] = (byStatus[row.current_status] || 0) + 1;
    const fam = row.family || '(aucune)';
    byFamily[fam] ||= {};
    byFamily[fam][row.current_status] = (byFamily[fam][row.current_status] || 0) + 1;
  }

  // 2. Cumulative "fait + clos" over time (by day).
  //    Take the completed_at of runs whose status is fait or clos — one row per
  //    case (the first completion). Cumulative count.
  const completionRows = await db
    .prepare(
      `SELECT DATE(MIN(r.completed_at)) AS day, COUNT(*) AS count_per_day
       FROM (
         SELECT plan_id, case_id, MIN(completed_at) AS completed_at
         FROM runs
         WHERE plan_id = ?
           AND status IN ('fait', 'clos')
           AND completed_at IS NOT NULL
         GROUP BY plan_id, case_id
       ) r
       GROUP BY DATE(r.completed_at)
       ORDER BY day`,
    )
    .bind(planId).all();

  let cumulative = 0;
  const cumulativeSeries = completionRows.results.map((r) => {
    cumulative += r.count_per_day;
    return { date: r.day, cumulative, delta: r.count_per_day };
  });

  // 3. Instability top 10 — cases with the most runs whose status is 'bug'.
  const instabilityRows = await db
    .prepare(
      `SELECT
        r.case_id, c.title, c.family,
        COUNT(*) AS bug_count
       FROM runs r
       JOIN cases c ON c.plan_id = r.plan_id AND c.id = r.case_id
       WHERE r.plan_id = ? AND r.status = 'bug'
       GROUP BY r.case_id
       ORDER BY bug_count DESC, r.case_id
       LIMIT 10`,
    )
    .bind(planId).all();

  // 4. Temps total pass� sur le plan (somme de tous les intervalles).
  let totalTimeMs = 0;
  try {
    const row = await db
      .prepare(
        `SELECT COALESCE(SUM(
                  (julianday(COALESCE(rti.ended_at, 'now')) - julianday(rti.started_at)) * 86400000
                ), 0) AS total_ms
         FROM run_time_intervals rti
         JOIN runs r ON r.id = rti.run_id
         WHERE r.plan_id = ?`,
      )
      .bind(planId).first();
    totalTimeMs = Math.round(row?.total_ms || 0);
  } catch { /* migration 0011 pas jou�e */ }

  return json({
    totals: {
      cases: statusRows.results.length,
      byStatus,
      total_time_ms: totalTimeMs,
    },
    byFamily,
    cumulative: cumulativeSeries,
    instability: instabilityRows.results,
  });
}
