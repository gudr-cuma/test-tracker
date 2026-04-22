import { json, error, methodNotAllowed, readJson, uuid, now } from '../../_lib/http.js';

const VALID_TARGETS = new Set(['case', 'run']);

async function listComments(context) {
  const url = new URL(context.request.url);
  const targetType = url.searchParams.get('targetType');
  const targetId = url.searchParams.get('targetId');
  if (!targetType || !targetId) return error(400, 'query params `targetType` and `targetId` are required');
  if (!VALID_TARGETS.has(targetType)) return error(400, `invalid targetType "${targetType}"`);

  const { results } = await context.env.DB
    .prepare(
      `SELECT c.id, c.target_type, c.target_id, c.body, c.created_at,
              c.author_id, t.name AS author_name
       FROM comments c
       LEFT JOIN testers t ON t.id = c.author_id
       WHERE c.target_type = ? AND c.target_id = ?
       ORDER BY c.created_at ASC`,
    )
    .bind(targetType, targetId).all();

  return json({ comments: results });
}

async function createComment(context) {
  const body = await readJson(context.request);
  if (!body) return error(400, 'invalid JSON body');

  const { target_type, target_id, body: text } = body;
  if (!target_type || !target_id || !text || !text.trim()) {
    return error(400, 'target_type, target_id and body are required');
  }
  if (!VALID_TARGETS.has(target_type)) return error(400, `invalid target_type "${target_type}"`);

  const authorId = context.data.tester ? context.data.tester.id : null;
  const id = uuid();
  const ts = now();

  await context.env.DB
    .prepare(
      `INSERT INTO comments (id, target_type, target_id, author_id, body, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, target_type, target_id, authorId, text.trim(), ts).run();

  const created = await context.env.DB
    .prepare(
      `SELECT c.id, c.target_type, c.target_id, c.body, c.created_at,
              c.author_id, t.name AS author_name
       FROM comments c
       LEFT JOIN testers t ON t.id = c.author_id
       WHERE c.id = ?`,
    )
    .bind(id).first();

  return json({ comment: created }, { status: 201 });
}

export async function onRequest(context) {
  switch (context.request.method) {
    case 'GET':  return listComments(context);
    case 'POST': return createComment(context);
    default:     return methodNotAllowed(['GET', 'POST']);
  }
}
