import { json, error, methodNotAllowed, readJson } from '../../../_lib/http.js';
import { hashPassword } from '../../../_lib/password.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(`
      SELECT id, email, name, is_active, is_admin, can_import, admin_plans, created_at, updated_at
      FROM users
      ORDER BY name ASC
    `).all();
    return json({ users: results });
  }

  if (request.method === 'POST') {
    const body = await readJson(request);
    if (!body?.email || !body?.name || !body?.password) {
      return error(400, 'email, name et password requis');
    }
    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE')
      .bind(body.email.trim()).first();
    if (existing) return error(409, 'Un utilisateur avec cet email existe déjà');

    const id = `user-${crypto.randomUUID()}`;
    const hash = await hashPassword(body.password);
    await env.DB.prepare(`
      INSERT INTO users (id, email, name, password_hash, is_active, is_admin, can_import, admin_plans)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      body.email.trim().toLowerCase(),
      body.name.trim(),
      hash,
      body.is_active ?? 1,
      body.is_admin ?? 0,
      body.can_import ?? 0,
      body.admin_plans ?? 0,
    ).run();

    return json({
      user: { id, email: body.email.trim().toLowerCase(), name: body.name.trim() },
    }, { status: 201 });
  }

  return methodNotAllowed(['GET', 'POST']);
}
