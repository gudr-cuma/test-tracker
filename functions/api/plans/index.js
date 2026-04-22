import { json, methodNotAllowed } from '../../_lib/http.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') return methodNotAllowed(['GET']);

  const { results } = await context.env.DB
    .prepare(
      `SELECT
        p.id, p.title, p.md_filename, p.last_imported_at,
        p.created_at, p.updated_at, p.color, p.icon, p.project_id,
        pr.name AS project_name, pr.color AS project_color, pr.icon AS project_icon,
        t.id AS tool_id, t.name AS tool_name,
        (SELECT COUNT(*) FROM cases c WHERE c.plan_id = p.id AND c.removed_from_md = 0) AS case_count,
        (SELECT COUNT(*) FROM runs r
          JOIN cases c ON c.plan_id = r.plan_id AND c.id = r.case_id
          WHERE c.plan_id = p.id) AS run_count
      FROM plans p
      LEFT JOIN projects pr ON pr.id = p.project_id
      LEFT JOIN tools t ON t.id = pr.tool_id
      WHERE p.archived = 0
      ORDER BY COALESCE(p.last_imported_at, p.created_at) DESC`,
    )
    .all();

  return json({ plans: results });
}
