import { json, error, methodNotAllowed } from '../../../_lib/http.js';

/**
 * GET /api/projects/:id/stats
 *
 * Retourne les statistiques d'avancement par plan/utilisateur pour le projet.
 *
 * Réponse :
 * {
 *   byUser: [{
 *     plan_id, plan_title, owner_id, owner_name,
 *     cases, done, bug, evolution, in_progress, pct
 *   }],
 *   totals: { cases, done, bug, evolution }
 * }
 */
async function getProjectStats(context) {
  const projectId = context.params.id;

  const project = await context.env.DB
    .prepare('SELECT id FROM projects WHERE id = ?')
    .bind(projectId).first();
  if (!project) return error(404, 'project not found');

  // Plans du projet
  const { results: plans } = await context.env.DB
    .prepare(
      `SELECT p.id, p.title, p.owner_id, u.name AS owner_name
       FROM plans p
       LEFT JOIN users u ON u.id = p.owner_id
       WHERE p.project_id = ? AND p.archived = 0
       ORDER BY COALESCE(p.last_imported_at, p.created_at) DESC`,
    )
    .bind(projectId).all();

  if (plans.length === 0) {
    return json({ byUser: [], totals: { cases: 0, done: 0, bug: 0, evolution: 0 } });
  }

  const planIds = plans.map((p) => p.id);
  const placeholders = planIds.map(() => '?').join(', ');

  // Cas actifs avec leur dernier statut pour chaque plan
  const { results: caseRows } = await context.env.DB
    .prepare(
      `SELECT
        c.plan_id,
        COALESCE(
          (SELECT r.status FROM runs r
            WHERE r.plan_id = c.plan_id AND r.case_id = c.id
            ORDER BY COALESCE(r.updated_at, r.created_at) DESC LIMIT 1),
          'a-faire'
        ) AS latest_status
       FROM cases c
       WHERE c.plan_id IN (${placeholders}) AND c.removed_from_md = 0`,
    )
    .bind(...planIds).all();

  // Agréger par plan
  const planStats = new Map(plans.map((p) => [p.id, {
    plan_id: p.id,
    plan_title: p.title,
    owner_id: p.owner_id,
    owner_name: p.owner_name,
    cases: 0,
    done: 0,
    bug: 0,
    evolution: 0,
    in_progress: 0,
    pct: 0,
  }]));

  for (const { plan_id, latest_status } of caseRows) {
    const s = planStats.get(plan_id);
    if (!s) continue;
    s.cases += 1;
    if (latest_status === 'fait' || latest_status === 'clos') s.done += 1;
    else if (latest_status === 'bug') s.bug += 1;
    else if (latest_status === 'evolution') s.evolution += 1;
    else if (latest_status === 'en-cours') s.in_progress += 1;
  }

  // Total temps pass� par plan (somme de tous les intervalles, ouverts compris).
  const timeByPlan = new Map();
  try {
    const { results: timeRows } = await context.env.DB
      .prepare(
        `SELECT r.plan_id,
                COALESCE(SUM(
                  (julianday(COALESCE(rti.ended_at, 'now')) - julianday(rti.started_at)) * 86400000
                ), 0) AS total_ms
         FROM run_time_intervals rti
         JOIN runs r ON r.id = rti.run_id
         WHERE r.plan_id IN (${placeholders})
         GROUP BY r.plan_id`,
      )
      .bind(...planIds).all();
    for (const row of timeRows) timeByPlan.set(row.plan_id, Math.round(row.total_ms || 0));
  } catch { /* migration 0011 pas jou�e */ }

  const byUser = plans.map((p) => {
    const s = planStats.get(p.id);
    s.pct = s.cases > 0 ? Math.round((s.done / s.cases) * 100) : 0;
    s.total_time_ms = timeByPlan.get(p.id) || 0;
    return s;
  });

  const totals = byUser.reduce(
    (acc, s) => {
      acc.cases += s.cases;
      acc.done += s.done;
      acc.bug += s.bug;
      acc.evolution += s.evolution;
      acc.total_time_ms += s.total_time_ms || 0;
      return acc;
    },
    { cases: 0, done: 0, bug: 0, evolution: 0, total_time_ms: 0 },
  );

  return json({ byUser, totals });
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') return methodNotAllowed(['GET']);
  return getProjectStats(context);
}
