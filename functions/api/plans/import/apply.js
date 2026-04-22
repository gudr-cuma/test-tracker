import { json, error, methodNotAllowed, readJson, uuid, now } from '../../../_lib/http.js';
import { parseMarkdown } from '../../../../src/engine/parseMarkdown.js';
import { diffCases, DIFFED_FIELDS } from '../../../../src/engine/diffCases.js';

function caseInsertStatement(db, planId, c, source, ts) {
  return db
    .prepare(
      `INSERT INTO cases
        (id, plan_id, family, title, preconditions, steps, expected, priority,
         source, removed_from_md, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    )
    .bind(
      c.id, planId, c.family || null, c.title,
      c.preconditions || null, c.steps || null,
      c.expected || null, c.priority || null,
      source, ts, ts,
    );
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') return methodNotAllowed(['POST']);

  if (!context.data.user?.can_import) {
    return error(403, 'Vous n\'avez pas le droit d\'importer un cahier de test');
  }

  const body = await readJson(context.request);
  if (!body) return error(400, 'invalid JSON body');
  const { md, filename, planId: inputPlanId, accepted, cases: incomingCases, title: incomingTitle } = body;

  let parsed;
  let importSource;
  if (incomingCases && Array.isArray(incomingCases)) {
    if (!incomingTitle || typeof incomingTitle !== 'string') {
      return error(400, '`title` est requis quand `cases` est fourni');
    }
    parsed = { title: incomingTitle, cases: incomingCases };
    importSource = 'excel';
  } else {
    if (!md || typeof md !== 'string') return error(400, '`md` is required (string)');
    try {
      parsed = parseMarkdown(md);
    } catch (e) {
      return error(400, 'markdown parse error', String(e.message || e));
    }
    importSource = 'markdown';
  }

  const db = context.env.DB;
  const ts = now();
  const statements = [];

  // ─── New plan ───────────────────────────────────────────────────────
  if (!inputPlanId) {
    const planId = uuid();
    const ownerId = context.data.user?.id || null;
    statements.push(
      db.prepare(
        `INSERT INTO plans (id, title, md_filename, md_content, last_imported_at, owner_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(planId, parsed.title, filename || null, importSource === 'markdown' ? md : null, ts, ownerId, ts, ts),
    );
    const versionId = uuid();
    statements.push(
      db.prepare(
        `INSERT INTO plan_versions (id, plan_id, md_content, imported_at, summary)
         VALUES (?, ?, ?, ?, ?)`,
      ).bind(versionId, planId, importSource === 'markdown' ? md : null, ts, `${parsed.cases.length} added`),
    );
    for (const c of parsed.cases) {
      statements.push(caseInsertStatement(db, planId, c, importSource, ts));
      statements.push(
        db.prepare(
          `INSERT INTO case_changes
             (id, plan_id, case_id, plan_version_id, change_type, field, old_value, new_value, changed_at)
           VALUES (?, ?, ?, ?, 'added', NULL, NULL, ?, ?)`,
        ).bind(uuid(), planId, c.id, versionId, JSON.stringify(c), ts),
      );
    }
    await db.batch(statements);
    return json({ planId, versionId, applied: { added: parsed.cases.length, changed: 0, removed: 0 } }, { status: 201 });
  }

  // ─── Existing plan ──────────────────────────────────────────────────
  const existingPlan = await db
    .prepare('SELECT * FROM plans WHERE id = ? AND archived = 0')
    .bind(inputPlanId).first();
  if (!existingPlan) return error(404, 'plan not found');

  const { results: dbCases } = await db
    .prepare('SELECT * FROM cases WHERE plan_id = ?')
    .bind(inputPlanId).all();

  const diff = diffCases(dbCases, parsed.cases);

  // Default: accept everything. Otherwise, filter by accepted IDs.
  const acceptedAddedIds = new Set(accepted?.addedIds ?? diff.added.map((c) => c.id));
  const acceptedChangedIds = new Set(accepted?.changedIds ?? diff.changed.map((c) => c.id));
  const acceptedRemovedIds = new Set(accepted?.removedIds ?? diff.removed.map((c) => c.id));

  const versionId = uuid();
  statements.push(
    db.prepare(
      `INSERT INTO plan_versions (id, plan_id, md_content, imported_at, summary)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(
      versionId,
      inputPlanId,
      importSource === 'markdown' ? md : null,
      ts,
      `${acceptedAddedIds.size} added, ${acceptedChangedIds.size} changed, ${acceptedRemovedIds.size} removed`,
    ),
  );

  let addedApplied = 0;
  for (const c of diff.added) {
    if (!acceptedAddedIds.has(c.id)) continue;
    statements.push(caseInsertStatement(db, inputPlanId, c, importSource, ts));
    statements.push(
      db.prepare(
        `INSERT INTO case_changes
           (id, plan_id, case_id, plan_version_id, change_type, field, old_value, new_value, changed_at)
         VALUES (?, ?, ?, ?, 'added', NULL, NULL, ?, ?)`,
      ).bind(uuid(), inputPlanId, c.id, versionId, JSON.stringify(c), ts),
    );
    addedApplied++;
  }

  let changedApplied = 0;
  for (const ch of diff.changed) {
    if (!acceptedChangedIds.has(ch.id)) continue;

    // Update fields + clear removed_from_md if restored
    const sets = [];
    const values = [];
    for (const f of DIFFED_FIELDS) {
      sets.push(`${f} = ?`);
      values.push(ch.incoming[f] ?? null);
    }
    if (ch.restored) {
      sets.push('removed_from_md = 0');
    }
    sets.push('updated_at = ?');
    values.push(ts);
    values.push(inputPlanId, ch.id);

    statements.push(
      db.prepare(`UPDATE cases SET ${sets.join(', ')} WHERE plan_id = ? AND id = ?`).bind(...values),
    );

    for (const fc of ch.fields) {
      statements.push(
        db.prepare(
          `INSERT INTO case_changes
             (id, plan_id, case_id, plan_version_id, change_type, field, old_value, new_value, changed_at)
           VALUES (?, ?, ?, ?, 'changed', ?, ?, ?, ?)`,
        ).bind(uuid(), inputPlanId, ch.id, versionId, fc.field, fc.old, fc.new, ts),
      );
    }
    if (ch.restored) {
      statements.push(
        db.prepare(
          `INSERT INTO case_changes
             (id, plan_id, case_id, plan_version_id, change_type, field, old_value, new_value, changed_at)
           VALUES (?, ?, ?, ?, 'restored', 'removed_from_md', '1', '0', ?)`,
        ).bind(uuid(), inputPlanId, ch.id, versionId, ts),
      );
    }
    changedApplied++;
  }

  let removedApplied = 0;
  for (const r of diff.removed) {
    if (!acceptedRemovedIds.has(r.id)) continue;
    statements.push(
      db.prepare(
        `UPDATE cases SET removed_from_md = 1, updated_at = ? WHERE plan_id = ? AND id = ?`,
      ).bind(ts, inputPlanId, r.id),
    );
    statements.push(
      db.prepare(
        `INSERT INTO case_changes
           (id, plan_id, case_id, plan_version_id, change_type, field, old_value, new_value, changed_at)
         VALUES (?, ?, ?, ?, 'removed', 'removed_from_md', '0', '1', ?)`,
      ).bind(uuid(), inputPlanId, r.id, versionId, ts),
    );
    removedApplied++;
  }

  statements.push(
    db.prepare(
      `UPDATE plans
         SET md_content = ?, md_filename = COALESCE(?, md_filename),
             last_imported_at = ?, updated_at = ?, title = ?
         WHERE id = ?`,
    ).bind(importSource === 'markdown' ? md : null, filename || null, ts, ts, parsed.title, inputPlanId),
  );

  await db.batch(statements);

  return json({
    planId: inputPlanId,
    versionId,
    applied: { added: addedApplied, changed: changedApplied, removed: removedApplied },
  });
}
