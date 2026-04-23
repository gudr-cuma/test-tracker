import { json, error, methodNotAllowed } from '../../../_lib/http.js';

/**
 * GET /api/projects/:id/cases
 *
 * Retourne tous les cas de test des plans du projet, avec pour chaque cas
 * les champs complets (pour le panel détail) et ses stats par plan (byPlan).
 */
async function listProjectCases(context) {
  const projectId = context.params.id;

  const project = await context.env.DB
    .prepare('SELECT id, name FROM projects WHERE id = ?')
    .bind(projectId).first();
  if (!project) return error(404, 'project not found');

  const { results: plansRows } = await context.env.DB
    .prepare(
      `SELECT p.id, p.title, p.owner_id, u.name AS owner_name
       FROM plans p
       LEFT JOIN users u ON u.id = p.owner_id
       WHERE p.project_id = ? AND p.archived = 0
       ORDER BY COALESCE(p.last_imported_at, p.created_at) DESC`,
    )
    .bind(projectId).all();

  if (plansRows.length === 0) return json({ plans: [], cases: [] });

  const planIds = plansRows.map((p) => p.id);
  const placeholders = planIds.map(() => '?').join(', ');

  let rows;
  try {
    ({ results: rows } = await context.env.DB
      .prepare(
        `SELECT
          c.id, c.plan_id, c.family, c.title, c.preconditions, c.steps, c.expected,
          c.priority, c.source, c.removed_from_md,
          COALESCE(pf.label, '') AS family_label,
          COALESCE(pf.position, 9999) AS family_position,
          (SELECT r.status FROM runs r
            WHERE r.plan_id = c.plan_id AND r.case_id = c.id
            ORDER BY COALESCE(r.updated_at, r.created_at) DESC LIMIT 1) AS latest_status,
          (SELECT COUNT(*) FROM runs r WHERE r.plan_id = c.plan_id AND r.case_id = c.id) AS run_count,
          (SELECT COUNT(*) FROM runs r WHERE r.plan_id = c.plan_id AND r.case_id = c.id AND r.status = 'bug') AS bug_count,
          (SELECT COUNT(*) FROM runs r WHERE r.plan_id = c.plan_id AND r.case_id = c.id AND r.status = 'evolution') AS evolution_count,
          (SELECT json_group_array(json_object('id', ci.id, 'position', ci.position, 'label', ci.label))
            FROM (SELECT id, position, label FROM case_checklist_items
                  WHERE plan_id = c.plan_id AND case_id = c.id
                  ORDER BY position) ci) AS checklist_json
        FROM cases c
        LEFT JOIN plan_families pf ON pf.plan_id = c.plan_id AND pf.family = c.family
        WHERE c.plan_id IN (${placeholders})
        ORDER BY family_position, c.family, c.id`,
      )
      .bind(...planIds).all());
  } catch {
    ({ results: rows } = await context.env.DB
      .prepare(
        `SELECT
          c.id, c.plan_id, c.family, c.title, c.preconditions, c.steps, c.expected,
          c.priority, c.source, c.removed_from_md,
          '' AS family_label, 9999 AS family_position,
          (SELECT r.status FROM runs r
            WHERE r.plan_id = c.plan_id AND r.case_id = c.id
            ORDER BY COALESCE(r.updated_at, r.created_at) DESC LIMIT 1) AS latest_status,
          (SELECT COUNT(*) FROM runs r WHERE r.plan_id = c.plan_id AND r.case_id = c.id) AS run_count,
          (SELECT COUNT(*) FROM runs r WHERE r.plan_id = c.plan_id AND r.case_id = c.id AND r.status = 'bug') AS bug_count,
          (SELECT COUNT(*) FROM runs r WHERE r.plan_id = c.plan_id AND r.case_id = c.id AND r.status = 'evolution') AS evolution_count,
          '[]' AS checklist_json
        FROM cases c
        WHERE c.plan_id IN (${placeholders})
        ORDER BY c.family, c.id`,
      )
      .bind(...planIds).all());
  }

  // Construire la structure groupée par case_id
  // Les champs "méta" (title, preconditions, steps…) viennent du premier plan qui possède le cas.
  // byPlan stocke les stats spécifiques à chaque plan.
  const caseMap = new Map();

  for (const row of rows) {
    const {
      id, plan_id, family, family_label, family_position,
      title, preconditions, steps, expected, priority, source, removed_from_md,
      latest_status, run_count, bug_count, evolution_count, checklist_json,
    } = row;

    if (!caseMap.has(id)) {
      let checklist = [];
      try { checklist = checklist_json ? JSON.parse(checklist_json) : []; } catch { /* noop */ }

      caseMap.set(id, {
        id, family, family_label, family_position,
        title, preconditions, steps, expected, priority, source,
        removed_from_md: Boolean(removed_from_md),
        checklist,
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
