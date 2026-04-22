import { error, json, readJson } from '../../_lib/http.js';
import { verifyPassword, dummyVerify } from '../../_lib/password.js';
import { generateSessionId, buildSessionCookie, getClientIp, sessionExpiresAt } from '../../_lib/session.js';

const MAX_ATTEMPTS = 10;
const LOCKOUT_MINUTES = 15;

export async function onRequestPost(context) {
  const { env, request } = context;
  const body = await readJson(request);
  if (!body?.email || !body?.password) {
    return error(400, 'email et password requis');
  }

  const { email, password } = body;

  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE email = ? COLLATE NOCASE',
  ).bind(email.trim()).first();

  if (!user) {
    await dummyVerify();
    return error(401, 'Email ou mot de passe incorrect');
  }

  // Vérification du lockout
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return error(403, `Compte verrouillé jusqu'à ${user.locked_until}. Réessayez plus tard.`);
  }

  if (!user.is_active) {
    await dummyVerify();
    return error(403, 'Compte désactivé');
  }

  const valid = await verifyPassword(password, user.password_hash);

  if (!valid) {
    const attempts = (user.failed_login_attempts || 0) + 1;
    if (attempts >= MAX_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
      await env.DB.prepare(
        "UPDATE users SET failed_login_attempts = ?, locked_until = ?, updated_at = datetime('now') WHERE id = ?",
      ).bind(attempts, lockedUntil, user.id).run();
      return error(403, `Trop de tentatives. Compte verrouillé ${LOCKOUT_MINUTES} min.`);
    }
    await env.DB.prepare(
      "UPDATE users SET failed_login_attempts = ?, updated_at = datetime('now') WHERE id = ?",
    ).bind(attempts, user.id).run();
    return error(401, 'Email ou mot de passe incorrect');
  }

  // Succès — reset compteur
  await env.DB.prepare(
    "UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = datetime('now') WHERE id = ?",
  ).bind(user.id).run();

  const sessionId = generateSessionId();
  const expiresAt = sessionExpiresAt();
  const ip = getClientIp(request);
  const ua = request.headers.get('User-Agent') || '';

  await env.DB.prepare(
    'INSERT INTO sessions (id, user_id, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
  ).bind(sessionId, user.id, expiresAt, ip, ua).run();

  return json(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: user.is_admin,
        can_import: user.can_import,
        admin_plans: user.admin_plans,
      },
    },
    { headers: { 'Set-Cookie': buildSessionCookie(sessionId) } },
  );
}
