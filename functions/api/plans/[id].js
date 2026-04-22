import { json, error, methodNotAllowed, now } from '../../_lib/http.js';

async function getPlan(context) {
  const url = new URL(context.request.url);
  const includeMd = url.searchParams.get('md') === '1';

  const columns = includeMd
    ? 'id, title, md_filename, md_content, last_imported_at, created_at, updated_at'
    : 'id, title, md_filename, last_imported_at, created_at, updated_at';

  const plan = await context.env.DB
    .prepare(`SELECT ${columns} FROM plans WHERE id = ? AND archived = 0`)
    .bind(context.params.id)
    .first();

  if (!plan) return error(404, 'plan not found');
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
    case 'DELETE':
      return archivePlan(context);
    default:
      return methodNotAllowed(['GET', 'DELETE']);
  }
}
