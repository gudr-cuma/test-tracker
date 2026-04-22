/**
 * Resolves (or creates) the tester matching the Cloudflare Access identity
 * and attaches it to `context.data.tester`. Exposes the D1 binding as
 * `context.data.db` for ergonomics.
 *
 * Local dev (no Access header) falls back to the seeded Guillaume row so
 * you can hit the API with curl / the Vite dev server without Access.
 */
const ACCESS_HEADER = 'Cf-Access-Authenticated-User-Email';
const FALLBACK_TESTER_ID = 'tester-guillaume';

async function resolveTester(db, email) {
  if (!email) {
    return db
      .prepare('SELECT * FROM testers WHERE id = ?')
      .bind(FALLBACK_TESTER_ID)
      .first();
  }

  const existing = await db
    .prepare('SELECT * FROM testers WHERE email = ?')
    .bind(email)
    .first();
  if (existing) return existing;

  const id = `tester-${crypto.randomUUID()}`;
  const name = email.split('@')[0];
  await db
    .prepare(
      'INSERT INTO testers (id, name, email, active) VALUES (?, ?, ?, 1)',
    )
    .bind(id, name, email)
    .run();
  return { id, name, email, active: 1 };
}

export async function onRequest(context) {
  const { request, env, data, next } = context;
  data.db = env.DB;
  try {
    const email = request.headers.get(ACCESS_HEADER);
    data.tester = await resolveTester(env.DB, email);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'tester resolution failed', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
  return next();
}
