import { json, error, methodNotAllowed, readJson, uuid, now } from '../../_lib/http.js';

async function listTools(context) {
  const { results } = await context.env.DB
    .prepare(`
      SELECT t.id, t.name, t.color, t.icon, t.created_at,
        (SELECT COUNT(*) FROM projects p WHERE p.tool_id = t.id) AS project_count
      FROM tools t
      ORDER BY t.name
    `)
    .all();

  return json({ tools: results });
}

async function createTool(context) {
  const body = await readJson(context.request);
  if (!body) return error(400, 'corps JSON invalide');

  const { name, color, icon } = body;
  if (!name || !name.trim()) return error(400, '`name` est requis');
  if (!color || !color.trim()) return error(400, '`color` est requis');
  if (!icon || !icon.trim()) return error(400, '`icon` est requis');

  const id = `tool-${uuid()}`;
  const ts = now();

  await context.env.DB
    .prepare('INSERT INTO tools (id, name, color, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, name.trim(), color.trim(), icon.trim(), ts, ts)
    .run();

  const tool = await context.env.DB
    .prepare('SELECT * FROM tools WHERE id = ?')
    .bind(id)
    .first();

  return json({ tool }, { status: 201 });
}

export async function onRequest(context) {
  switch (context.request.method) {
    case 'GET':
      return listTools(context);
    case 'POST':
      return createTool(context);
    default:
      return methodNotAllowed(['GET', 'POST']);
  }
}
