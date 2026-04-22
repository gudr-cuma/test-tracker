import { json, methodNotAllowed } from '../_lib/http.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') return methodNotAllowed(['GET']);
  const { results } = await context.env.DB
    .prepare('SELECT id, name, email, active FROM testers WHERE active = 1 ORDER BY name')
    .all();
  return json({
    testers: results,
    me: context.data.tester ? context.data.tester.id : null,
  });
}
