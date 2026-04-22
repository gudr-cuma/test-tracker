import { json, error, methodNotAllowed, readJson, now } from '../../../_lib/http.js';
import { hashPassword } from '../../../_lib/password.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  const { id } = params;

  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  if (!user) return error(404, 'Utilisateur introuvable');

  if (request.method === 'PATCH') {
    const body = await readJson(request);
    if (!body) return error(400, 'Body JSON requis');

    const allowed = ['email', 'name', 'is_active', 'is_admin', 'can_import', 'admin_plans'];
    const sets = [];
    const values = [];

    for (const field of allowed) {
      if (field in body) {
        sets.push(`${field} = ?`);
        values.push(typeof body[field] === 'string' ? body[field].trim() : body[field]);
      }
    }

    if (body.password) {
      sets.push('password_hash = ?');
      values.push(await hashPassword(body.password));
      sets.push('failed_login_attempts = 0');
      sets.push('locked_until = NULL');
    }

    if (sets.length === 0) return error(400, 'Aucun champ à modifier');

    sets.push("updated_at = ?");
    values.push(now());
    values.push(id);

    await env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();

    const updated = await env.DB.prepare(
      'SELECT id, email, name, is_active, is_admin, can_import, admin_plans, updated_at FROM users WHERE id = ?',
    ).bind(id).first();
    return json({ user: updated });
  }

  if (request.method === 'DELETE') {
    // Empêcher de supprimer son propre compte admin
    if (id === context.data.user?.id) {
      return error(409, 'Vous ne pouvez pas supprimer votre propre compte');
    }
    // Sessions supprimées par CASCADE
    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  return methodNotAllowed(['PATCH', 'DELETE']);
}
