// Helpers pour la gestion des intervalles de temps d'un run.
//
// Invariants :
//  - Au plus un intervalle ouvert (ended_at IS NULL) par run à tout instant.
//  - last_ping_at est mis à jour à chaque action (start / ping) ; si on
//    détecte un intervalle ouvert dont last_ping_at est vieux de plus de
//    HEARTBEAT_TIMEOUT_SEC secondes, on le ferme automatiquement (cap
//    orphelins après fermeture d'onglet).

import { uuid, now } from './http.js';

export const HEARTBEAT_TIMEOUT_SEC = 120; // 2 minutes
export const STOPPING_STATUSES = new Set(['clos', 'fait', 'en-pause']);

/**
 * Ferme tout intervalle ouvert dont last_ping_at est trop vieux.
 * À appeler en début de requête sur un run pour garantir la propreté
 * avant lecture ou écriture.
 */
export async function gcStaleIntervals(db, runId) {
  await db
    .prepare(
      `UPDATE run_time_intervals
         SET ended_at = last_ping_at, closed_reason = 'heartbeat_timeout'
       WHERE run_id = ?
         AND ended_at IS NULL
         AND (julianday('now') - julianday(last_ping_at)) * 86400 > ?`,
    )
    .bind(runId, HEARTBEAT_TIMEOUT_SEC)
    .run();
}

/**
 * Ferme (s'il existe) l'intervalle ouvert d'un run avec la raison donnée.
 */
export async function closeOpenInterval(db, runId, reason = 'manual') {
  const ts = now();
  await db
    .prepare(
      `UPDATE run_time_intervals
         SET ended_at = ?, closed_reason = ?
       WHERE run_id = ? AND ended_at IS NULL`,
    )
    .bind(ts, reason, runId)
    .run();
}

/**
 * Ouvre un intervalle (sauf s'il en existe déjà un ouvert).
 */
export async function openInterval(db, runId, userId) {
  const existing = await db
    .prepare(
      `SELECT id FROM run_time_intervals
       WHERE run_id = ? AND ended_at IS NULL LIMIT 1`,
    )
    .bind(runId)
    .first();
  if (existing) return existing.id;

  const id = uuid();
  const ts = now();
  await db
    .prepare(
      `INSERT INTO run_time_intervals
         (id, run_id, user_id, started_at, ended_at, last_ping_at, closed_reason)
       VALUES (?, ?, ?, ?, NULL, ?, NULL)`,
    )
    .bind(id, runId, userId || null, ts, ts)
    .run();
  return id;
}

/**
 * Met à jour last_ping_at sur l'intervalle ouvert d'un run.
 * Retourne true si un intervalle ouvert a été trouvé et ping-é.
 */
export async function pingInterval(db, runId) {
  const ts = now();
  const res = await db
    .prepare(
      `UPDATE run_time_intervals
         SET last_ping_at = ?
       WHERE run_id = ? AND ended_at IS NULL`,
    )
    .bind(ts, runId)
    .run();
  return Boolean(res.meta && res.meta.changes > 0);
}
