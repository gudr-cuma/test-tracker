import { json, error, methodNotAllowed } from '../../../_lib/http.js';

/**
 * GET /api/projects/:id/cases
 *
 * Retourne tous les cas de test présents dans les plans du projet,
 * avec pour chaque cas son statut par plan (structure byPlan).
 *
 * Réponse :
 * {
 *   plans: [{ id, title, owner_id, owner_name }],
 *   cases: [{
 *     id, family, family_label, family_position, title,
 *     byPlan: { [planId]: { latest_status, run_count, bug_count, evolution_count } }
 *   }]
 * }
 */
async function listProjectCases(context) {
  const projectId = context.params.id;

  // 1. Vérifier que le projet existe
  const project = await context.env.DB
    .prepare('SELECT id, name FROM projects WHERE id = ?')
    .bind(projectId).first();
  if (!project) return error(404, 'project not found');

  // 2. Récupérer les plans du projet avec nom du propriétaire
  const { results: plansRows } = await context.env.DB
    .prepare(
      `SELECT p.id, p.title, p.owner_id, u.name AS owner_name
       FROM plans p
       LEFT JOIN users u ON u.id = p.owner_id
       WHERE p.project_id = ? AND p.archived = 0
       ORDER BY COALESCE(p.last_imported_at, p.created_at) DESC`,
    )
    .bind(projectId).all();

  if (plansRows.length === 0) {
    return json({ plans: [], cases: [] });
  }

  const planIds = plansRows.map((p) => p.id);
  const placeholders = planIds.map(() => '?').join(', ');

  // 3. Récupérer tous les cas actifs de ces plans avec agrégats
  let rows;
  try {
    ({ results: rows } = await context.env.DB
      .prepare(
        `SELECT
          c.id, c.plan_id, c.family, c.title, c.priority, c.removed_from_md,
          COALESCE(pf.label, '') AS family_label,
          COALESCE(pf.position, 9999) AS family_position,
          (SELECT r.status FROM runs r
            WHERE r.plan_id = c.plan_id AND r.case_id = c.id
            ORDER BY COALESCE(r.updated_at, r.created_at) DESC LIMIT 1) AS latest_status,
          (SELECT COUNT(*) FROM runs r WHERE r.plan_id = c.plan_id AND r.case_id = c.id) AS run_count,
          (SELECT COUNT(*) FROM runs r WHERE r.plan_id = c.plan_id AND r.case_id = c.id AND r.status = 'bug') AS bug_count,
          (SELECT COUNT(*) FROM runs r WHERE r.plan_id = c.plan_id AND r.case_id = c.id AND r.status = 'evolution') AS evolution_count
        FROM cases c
        LEFT JOIN plan_families pf ON pf.plan_id = c.plan_id AND pf.family = c.family
        WHERE c.plan_id IN (${placeholders})
        ORDER BY family_position, c.family, c.id`,
      )
      .bind(...planIds).all());
  } catch {
    // Fallback sans plan_families si migration pas encore appliquée
    ({ results: rows } = await context.env.DB
      .prepare(
        `SELECT
          c.id, c.plan_id, c.family, c.title, c.priority, c.removed_from_md,
          '' AS family_label,
          9999 AS family_position,
          (SELECT r.status FROM runs r
            WHERE r.plan_id = c.plan_id AND r.case_id = c.id
            ORDER BY COALESCE(r.updated_at, r.created_at) DESC LIMIT 1) AS latest_status,
          (SELECT COUNT(*) FROM runs r WHERE r.plan_id = c.plan_id AND r.case_id = c.id) AS run_count,
          (SELECT COUNT(*) FROM runs r WHERE r.plan_id = c.plan_id AND r.case_id = c.id AND r.status = 'bug') AS bug_count,
          (SELECT COUNT(*) FROM runs r WHERE r.plan_id = c.plan_id AND r.case_id = c.id AND r.status = 'evolution') AS evolution_count
        FROM cases c
        WHERE c.plan_id IN (${placeholders})
        ORDER BY c.family, c.id`,
      )
      .bind(...planIds).all());
  }

  // 4. Construire la structure groupée par case_id
  // Map: caseId → { meta, byPlan: { planId → stats } }
  const caseMap = new Map();

  for (const row of rows) {
    const { id, plan_id, family, family_label, family_position, title, priority,
            removed_from_md, latest_status, run_count, bug_count, evolution_count } = row;

    if (!caseMap.has(id)) {
      caseMap.set(id, {
        id,
        family,
        family_label,
        family_position,
        title,
        priority,
        removed_from_md: Boolean(removed_from_md),
        byPlan: {},
      });
    }

    caseMap.get(id).byPlan[plan_id] = {
      latest_status: latest_status || 'a-faire',
      run_count: run_count || 0,
      bug_count: bug_count || 0,
      evolution_count: evolution_count || 0,
    };
  }

  // Trier par family_position, family, case_id
  const cases = [...caseMap.values()].sort((a, b) => {
    if (a.family_position !== b.family_position) return a.family_position - b.family_position;
    if (a.family < b.family) return -1;
    if (a.family > b.family) return 1;
    return a.id < b.id ? -1 : 1;
  });

  return json({ plans: plansRows, cases });
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') return methodNotAllowed(['GET']);
  return listProjectCases(context);
}
