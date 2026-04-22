import { json, error, methodNotAllowed, readJson, uuid, now } from '../../_lib/http.js';

async function listProjects(context) {
  const { results } = await context.env.DB
    .prepare(`
      SELECT
        p.id, p.name, p.tool_id, p.color, p.icon, p.created_at,
        t.name AS tool_name, t.color AS tool_color, t.icon AS tool_icon,
        (SELECT COUNT(*) FROM plans pl WHERE pl.project_id = p.id AND pl.archived = 0) AS plan_count
      FROM projects p
      LEFT JOIN tools t ON t.id = p.tool_id
      ORDER BY p.name
    `)
    .all();

  return json({ projects: results });
}

async function createProject(context) {
  const body = await readJson(context.request);
  if (!body) return error(400, 'corps JSON invalide');

  const { name, tool_id, color, icon } = body;
  if (!name || !name.trim()) return error(400, '`name` est requis');
  if (!color || !color.trim()) return error(400, '`color` est requis');
  if (!icon || !icon.trim()) return error(400, '`icon` est requis');

  if (tool_id) {
    const tool = await context.env.DB
      .prepare('SELECT id FROM tools WHERE id = ?')
      .bind(tool_id)
      .first();
    if (!tool) return error(404, 'outil non trouvé');
  }

  const id = `project-${uuid()}`;
  const ts = now();

  await context.env.DB
    .prepare('INSERT INTO projects (id, name, tool_id, color, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, name.trim(), tool_id || null, color.trim(), icon.trim(), ts, ts)
    .run();

  const project = await context.env.DB
    .prepare(`
      SELECT p.*, t.name AS tool_name, t.color AS tool_color, t.icon AS tool_icon
      FROM projects p LEFT JOIN tools t ON t.id = p.tool_id
      WHERE p.id = ?
    `)
    .bind(id)
    .first();

  return json({ project }, { status: 201 });
}

export async function onRequest(context) {
  switch (context.request.method) {
    case 'GET':
      return listProjects(context);
    case 'POST':
      return createProject(context);
    default:
      return methodNotAllowed(['GET', 'POST']);
  }
}
