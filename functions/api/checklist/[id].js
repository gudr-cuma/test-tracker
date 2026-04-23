import { json, error, methodNotAllowed, readJson, now } from '../../_lib/http.js';

async function getItem(db, id) {
  return db
    .prepare('SELECT * FROM case_checklist_items WHERE id = ?')
    .bind(id).first();
}

async function patchItem(context) {
  const body = await readJson(context.request);
  if (!body) return error(400, 'invalid JSON body');

  const id = context.params.id;
  const db = context.env.DB;
  const item = await getItem(db, id);
  if (!item) return error(404, 'item not found');

  const ts = now();
  const statements = [];

  if (typeof body.position === 'number' && body.position !== item.position) {
    const { count } = await db
      .prepare('SELECT COUNT(*) AS count FROM case_checklist_items WHERE plan_id = ? AND case_id = ?')
      .bind(item.plan_id, item.case_id).first();

    let target = Math.max(0, Math.min(count - 1, Math.trunc(body.position)));
    if (target !== item.position) {
      if (target < item.position) {
        // move up: items in [target, item.position-1] shift +1
        statements.push(
          db.prepare(`UPDATE case_checklist_items
                      SET position = position + 1, updated_at = ?
                      WHERE plan_id = ? AND case_id = ? AND position >= ? AND position < ?`)
            .bind(ts, item.plan_id, item.case_id, target, item.position),
        );
      } else {
        // move down: items in [item.position+1, target] shift -1
        statements.push(
          db.prepare(`UPDATE case_checklist_items
                      SET position = position - 1, updated_at = ?
                      WHERE plan_id = ? AND case_id = ? AND position > ? AND position <= ?`)
            .bind(ts, item.plan_id, item.case_id, item.position, target),
        );
      }
      statements.push(
        db.prepare('UPDATE case_checklist_items SET position = ?, updated_at = ? WHERE id = ?')
          .bind(target, ts, id),
      );
    }
  }

  if (typeof body.label === 'string') {
    const label = body.label.trim();
    if (!label) return error(400, 'label cannot be empty');
    statements.push(
      db.prepare('UPDATE case_checklist_items SET label = ?, updated_at = ? WHERE id = ?')
        .bind(label, ts, id),
    );
  }

  if (statements.length === 0) return error(400, 'no changes');

  await db.batch(statements);
  const updated = await getItem(db, id);
  return json({ item: updated });
}

async function deleteItem(context) {
  const id = context.params.id;
  const db = context.env.DB;
  const item = await getItem(db, id);
  if (!item) return error(404, 'item not found');

  const ts = now();
  await db.batch([
    db.prepare('DELETE FROM case_checklist_items WHERE id = ?').bind(id),
    db.prepare(`UPDATE case_checklist_items
                SET position = position - 1, updated_at = ?
                WHERE plan_id = ? AND case_id = ? AND position > ?`)
      .bind(ts, item.plan_id, item.case_id, item.position),
  ]);

  return json({ ok: true });
}

export async function onRequest(context) {
  switch (context.request.method) {
    case 'PATCH':  return patchItem(context);
    case 'DELETE': return deleteItem(context);
    default:       return methodNotAllowed(['PATCH', 'DELETE']);
  }
}
