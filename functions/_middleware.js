import { getSessionId } from './_lib/session.js';

const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/bootstrap'];

export async function onRequest(context) {
  const { request, env, data, next } = context;
  data.db = env.DB;

  const pathname = new URL(request.url).pathname;

  if (PUBLIC_PATHS.includes(pathname)) {
    return next();
  }

  const sessionId = getSessionId(request);
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const row = await env.DB.prepare(`
    SELECT u.id, u.email, u.name, u.is_admin, u.can_import, u.admin_plans
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
      AND s.is_revoked = 0
      AND s.expires_at > datetime('now')
      AND u.is_active = 1
  `).bind(sessionId).first();

  if (!row) {
    return new Response(JSON.stringify({ error: 'Session expirée ou invalide' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  context.waitUntil(
    env.DB.prepare("UPDATE sessions SET last_seen = datetime('now') WHERE id = ?")
      .bind(sessionId).run(),
  );

  data.user = row;
  data.sessionId = sessionId;

  if (pathname.startsWith('/api/admin/') && !row.is_admin) {
    return new Response(JSON.stringify({ error: 'Accès refusé' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return next();
}
