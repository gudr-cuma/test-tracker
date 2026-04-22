import { json, error, methodNotAllowed, readJson, now } from '../../_lib/http.js';
import { VALID_STATUSES } from './index.js';

async function patchRun(context) {
  const body = await readJson(context.request);
  if (!body || typeof body !== 'object') return error(400, 'invalid JSON body');

  const current = await context.env.DB
    .prepare('SELECT * FROM runs WHERE id = ?')
    .bind(context.params.id).first();
  if (!current) return error(404, 'run not found');

  const sets = [];
  const values = [];
  const ts = now();

  if ('status' in body) {
    if (!VALID_STATUSES.has(body.status)) return error(400, `invalid status "${body.status}"`);
    sets.push('status = ?');
    values.push(body.status);

    // Auto-stamp started_at when transitioning to en-cours (only if unset)
    if (body.status === 'en-cours' && !current.started_at) {
      sets.push('started_at = ?');
      values.push(ts);
    }
    // Auto-stamp completed_at when transitioning to fait or clos (only if unset)
    if ((body.status === 'fait' || body.status === 'clos') && !current.completed_at) {
      sets.push('completed_at = ?');
      values.push(ts);
    }
  }

  if ('tester_id' in body) {
    sets.push('tester_id = ?');
    values.push(body.tester_id);
  }

  // Manual overrides
  if ('started_at' in body) {
    sets.push('started_at = ?');
    values.push(body.started_at);
  }
  if ('completed_at' in body) {
    sets.push('completed_at = ?');
    values.push(body.completed_at);
  }

  if (sets.length === 0) return error(400, 'no editable fields in body');

  sets.push('updated_at = ?');
  values.push(ts);
  values.push(context.params.id);

  await context.env.DB
    .prepare(`UPDATE runs SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...values).run();

  const updated = await context.env.DB
    .prepare('SELECT * FROM runs WHERE id = ?')
    .bind(context.params.id).first();
  return json({ run: updated });
}

async function deleteRun(context) {
  const res = await context.env.DB
    .prepare('DELETE FROM runs WHERE id = ?')
    .bind(context.params.id).run();
  if (!res.meta || res.meta.changes === 0) return error(404, 'run not found');
  return new Response(null, { status: 204 });
}

export async function onRequest(context) {
  switch (context.request.method) {
    case 'PATCH':  return patchRun(context);
    case 'DELETE': return deleteRun(context);
    default:       return methodNotAllowed(['PATCH', 'DELETE']);
  }
}
