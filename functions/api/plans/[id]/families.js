import { json, error, methodNotAllowed, readJson } from '../../../_lib/http.js';

export async function onRequest(context) {
  const planId = context.params.id;

  if (context.request.method === 'GET') {
    const { results } = await context.env.DB
      .prepare('SELECT family, label FROM plan_families WHERE plan_id = ? ORDER BY family')
      .bind(planId)
      .all();
    return json({ families: results });
  }

  if (context.request.method === 'PATCH') {
    if (!context.data.user?.can_import) {
      return error(403, 'Vous n\'avez pas le droit de modifier les libellés de famille');
    }
    const body = await readJson(context.request);
    if (!body?.family) return error(400, '`family` est requis');
    const label = typeof body.label === 'string' ? body.label.trim() : '';

    await context.env.DB
      .prepare(`
        INSERT INTO plan_families (plan_id, family, label) VALUES (?, ?, ?)
        ON CONFLICT (plan_id, family) DO UPDATE SET label = excluded.label
      `)
      .bind(planId, body.family, label)
      .run();

    return json({ ok: true, family: body.family, label });
  }

  return methodNotAllowed(['GET', 'PATCH']);
}
