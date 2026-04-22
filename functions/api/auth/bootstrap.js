import { error, json, readJson } from '../../_lib/http.js';
import { hashPassword } from '../../_lib/password.js';

// GET — vérifie si le bootstrap est disponible (aucun user en base)
export async function onRequestGet(context) {
  const count = await context.env.DB.prepare('SELECT COUNT(*) as n FROM users').first();
  return json({ available: (count?.n ?? 1) === 0 });
}

// POST — crée le premier admin (uniquement si table users vide)
export async function onRequestPost(context) {
  const { env, request } = context;

  const count = await env.DB.prepare('SELECT COUNT(*) as n FROM users').first();
  if (count?.n > 0) {
    return error(403, 'Bootstrap désactivé : des utilisateurs existent déjà');
  }

  const body = await readJson(request);
  if (!body?.email || !body?.name || !body?.password) {
    return error(400, 'email, name et password requis');
  }

  const id = `user-${crypto.randomUUID()}`;
  const hash = await hashPassword(body.password);

  await env.DB.prepare(`
    INSERT INTO users (id, email, name, password_hash, is_admin, can_import, admin_plans)
    VALUES (?, ?, ?, ?, 1, 1, 1)
  `).bind(id, body.email.trim().toLowerCase(), body.name.trim(), hash).run();

  return json({ ok: true, id }, { status: 201 });
}
