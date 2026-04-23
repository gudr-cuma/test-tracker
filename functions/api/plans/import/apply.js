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

function checklistReplaceStatements(db, planId, caseId, items, ts) {
  const out = [
    db.prepare('DELETE FROM case_checklist_items WHERE plan_id = ? AND case_id = ?')
      .bind(planId, caseId),
  ];
  if (!Array.isArray(items)) return out;
  let position = 0;
  for (const it of items) {
    const label = typeof it === 'string' ? it : it?.label;
    if (!label || !String(label).trim()) continue;
    out.push(
      db.prepare(
        `INSERT INTO case_checklist_items
           (id, plan_id, case_id, position, label, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(crypto.randomUUID(), planId, caseId, position, String(label).trim(), ts, ts),
    );
    position++;
  }
  return out;
}

export async function onRequest(context) {
  try {
    return await _handle(context);
  } catch (e) {
    console.error('[apply] uncaught:', e);
    return new Response(
      JSON.stringify({ _debug_error: String(e?.message ?? e), _debug_stack: String(e?.stack ?? '') }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

async function _handle(context) {
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

  // Détecte si la migration checklist a été appliquée.
  let checklistSupported = false;
  try {
    await db.prepare('SELECT 1 FROM case_checklist_items LIMIT 0').run();
    checklistSupported = true;
  } catch { /* table absente */ }

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
      ).bind(versionId, planId, importSource === 'markdown' ? md : '', ts, `${parsed.cases.length} added`),
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
      if (checklistSupported && Array.isArray(c.checklist) && c.checklist.length > 0) {
        for (const s of checklistReplaceStatements(db, planId, c.id, c.checklist, ts)) {
          statements.push(s);
        }
      }
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

  let dbItems = [];
  if (checklistSupported) {
    try {
      const res = await db
        .prepare(`SELECT case_id, position, label FROM case_checklist_items
                  WHERE plan_id = ? ORDER BY case_id, position`)
        .bind(inputPlanId).all();
      dbItems = res.results;
    } catch { /* noop */ }
  }
  const itemsByCase = new Map();
  for (const it of dbItems) {
    if (!itemsByCase.has(it.case_id)) itemsByCase.set(it.case_id, []);
    itemsByCase.get(it.case_id).push({ position: it.position, label: it.label });
  }
  for (const c of dbCases) c.checklist = itemsByCase.get(c.id) || [];

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
      importSource === 'markdown' ? md : '',
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
    if (checklistSupported && Array.isArray(c.checklist) && c.checklist.length > 0) {
      for (const s of checklistReplaceStatements(db, inputPlanId, c.id, c.checklist, ts)) {
        statements.push(s);
      }
    }
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

    if (checklistSupported && ch.checklistChanged) {
      for (const s of checklistReplaceStatements(db, inputPlanId, ch.id, ch.incoming.checklist, ts)) {
        statements.push(s);
      }
    }

    for (const fc of ch.fields) {
      const oldVal = Array.isArray(fc.old) ? JSON.stringify(fc.old) : fc.old;
      const newVal = Array.isArray(fc.new) ? JSON.stringify(fc.new) : fc.new;
      statements.push(
        db.prepare(
          `INSERT INTO case_changes
             (id, plan_id, case_id, plan_version_id, change_type, field, old_value, new_value, changed_at)
           VALUES (?, ?, ?, ?, 'changed', ?, ?, ?, ?)`,
        ).bind(uuid(), inputPlanId, ch.id, versionId, fc.field, oldVal, newVal, ts),
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
