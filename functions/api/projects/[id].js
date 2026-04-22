import { json, error, methodNotAllowed, readJson, now } from '../../_lib/http.js';

async function updateProject(context) {
  const body = await readJson(context.request);
  if (!body) return error(400, 'corps JSON invalide');

  const allowed = ['name', 'tool_id', 'color', 'icon'];
  const fields = Object.keys(body).filter((k) => allowed.includes(k) && body[k] !== undefined);
  if (fields.length === 0) return error(400, 'aucun champ modifiable fourni');

  if (body.tool_id) {
    const tool = await context.env.DB
      .prepare('SELECT id FROM tools WHERE id = ?')
      .bind(body.tool_id)
      .first();
    if (!tool) return error(404, 'outil non trouvé');
  }

  const sets = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => (f === 'tool_id' ? body[f] || null : body[f]));
  values.push(now(), context.params.id);

  const res = await context.env.DB
    .prepare(`UPDATE projects SET ${sets}, updated_at = ? WHERE id = ?`)
    .bind(...values)
    .run();

  if (!res.meta || res.meta.changes === 0) return error(404, 'projet non trouvé');

  const project = await context.env.DB
    .prepare(`
      SELECT p.*, t.name AS tool_name, t.color AS tool_color, t.icon AS tool_icon
      FROM projects p LEFT JOIN tools t ON t.id = p.tool_id
      WHERE p.id = ?
    `)
    .bind(context.params.id)
    .first();

  return json({ project });
}

async function deleteProject(context) {
  const linked = await context.env.DB
    .prepare('SELECT COUNT(*) AS cnt FROM plans WHERE project_id = ? AND archived = 0')
    .bind(context.params.id)
    .first();

  if (linked && linked.cnt > 0) {
    return error(409, 'Ce projet a des plans de test liés. Détachez les plans d\'abord.');
  }

  const res = await context.env.DB
    .prepare('DELETE FROM projects WHERE id = ?')
    .bind(context.params.id)
    .run();

  if (!res.meta || res.meta.changes === 0) return error(404, 'projet non trouvé');
  return new Response(null, { status: 204 });
}

export async function onRequest(context) {
  switch (context.request.method) {
    case 'PATCH':
      return updateProject(context);
    case 'DELETE':
      return deleteProject(context);
    default:
      return methodNotAllowed(['PATCH', 'DELETE']);
  }
}
