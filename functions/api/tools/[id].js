import { json, error, methodNotAllowed, readJson, now } from '../../_lib/http.js';

async function updateTool(context) {
  const body = await readJson(context.request);
  if (!body) return error(400, 'corps JSON invalide');

  const allowed = ['name', 'color', 'icon'];
  const fields = Object.keys(body).filter((k) => allowed.includes(k) && body[k] !== undefined);
  if (fields.length === 0) return error(400, 'aucun champ modifiable fourni');

  const sets = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => body[f]);
  values.push(now(), context.params.id);

  const res = await context.env.DB
    .prepare(`UPDATE tools SET ${sets}, updated_at = ? WHERE id = ?`)
    .bind(...values)
    .run();

  if (!res.meta || res.meta.changes === 0) return error(404, 'outil non trouvé');

  const tool = await context.env.DB
    .prepare('SELECT * FROM tools WHERE id = ?')
    .bind(context.params.id)
    .first();

  return json({ tool });
}

async function deleteTool(context) {
  const linked = await context.env.DB
    .prepare('SELECT COUNT(*) AS cnt FROM projects WHERE tool_id = ?')
    .bind(context.params.id)
    .first();

  if (linked && linked.cnt > 0) {
    return error(409, 'Cet outil a des projets liés. Supprimez ou détachez les projets d\'abord.');
  }

  const res = await context.env.DB
    .prepare('DELETE FROM tools WHERE id = ?')
    .bind(context.params.id)
    .run();

  if (!res.meta || res.meta.changes === 0) return error(404, 'outil non trouvé');
  return new Response(null, { status: 204 });
}

export async function onRequest(context) {
  switch (context.request.method) {
    case 'PATCH':
      return updateTool(context);
    case 'DELETE':
      return deleteTool(context);
    default:
      return methodNotAllowed(['PATCH', 'DELETE']);
  }
}
