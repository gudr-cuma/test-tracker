import { json } from '../../_lib/http.js';
import { clearSessionCookie } from '../../_lib/session.js';

export async function onRequestPost(context) {
  const { env, data } = context;
  if (data.sessionId) {
    await env.DB.prepare("UPDATE sessions SET is_revoked = 1 WHERE id = ?")
      .bind(data.sessionId).run();
  }
  return json(
    { ok: true },
    { headers: { 'Set-Cookie': clearSessionCookie() } },
  );
}
