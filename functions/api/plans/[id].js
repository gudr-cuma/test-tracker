import { json, error, methodNotAllowed, readJson, now } from '../../_lib/http.js';

async function getPlan(context) {
  const url = new URL(context.request.url);
  const includeMd = url.searchParams.get('md') === '1';

  const columns = includeMd
    ? 'id, title, md_filename, md_content, last_imported_at, created_at, updated_at, color, icon, project_id'
    : 'id, title, md_filename, last_imported_at, created_at, updated_at, color, icon, project_id';

  const plan = await context.env.DB
    .prepare(`SELECT ${columns} FROM plans WHERE id = ? AND archived = 0`)
    .bind(context.params.id)
    .first();

  if (!plan) return error(404, 'plan not found');
  return json({ plan });
}

async function patchPlan(context) {
  const body = await readJson(context.request);
  if (!body) return error(400, 'corps JSON invalide');

  const user = context.data.user;
  const allowed = ['title', 'project_id', 'color', 'icon'];
  // owner_id ne peut être modifié que par un admin_plans
  if (user?.admin_plans && 'owner_id' in body) allowed.push('owner_id');
  const fields = Object.keys(body).filter((k) => allowed.includes(k) && body[k] !== undefined);
  if (fields.length === 0) return error(400, 'aucun champ modifiable fourni');

  const sets = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => (f === 'project_id' ? body[f] || null : body[f]));
  values.push(now(), context.params.id);

  const res = await context.env.DB
    .prepare(`UPDATE plans SET ${sets}, updated_at = ? WHERE id = ? AND archived = 0`)
    .bind(...values)
    .run();

  if (!res.meta || res.meta.changes === 0) return error(404, 'plan not found');

  const plan = await context.env.DB
    .prepare('SELECT id, title, md_filename, last_imported_at, created_at, updated_at, color, icon, project_id FROM plans WHERE id = ?')
    .bind(context.params.id)
    .first();

  return json({ plan });
}

async function archivePlan(context) {
  const res = await context.env.DB
    .prepare('UPDATE plans SET archived = 1, updated_at = ? WHERE id = ? AND archived = 0')
    .bind(now(), context.params.id)
    .run();

  if (!res.meta || res.meta.changes === 0) return error(404, 'plan not found');
  return new Response(null, { status: 204 });
}

export async function onRequest(context) {
  switch (context.request.method) {
    case 'GET':
      return getPlan(context);
    case 'PATCH':
      return patchPlan(context);
    case 'DELETE':
      return archivePlan(context);
    default:
      return methodNotAllowed(['GET', 'PATCH', 'DELETE']);
  }
}
