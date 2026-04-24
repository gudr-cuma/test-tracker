import { useCallback, useEffect, useRef, useState } from 'react';
import { runsApi } from '../api/resources.js';

const PING_INTERVAL_MS = 30_000;
const TICK_INTERVAL_MS = 1_000;

/**
 * Gère le compteur de temps d'un run côté client.
 *
 * - Maintient un ticker local (setInterval 1s) qui incrémente `elapsedMs`
 *   tant que le timer est actif.
 * - Envoie un heartbeat ping toutes les 30s au serveur tant qu'actif.
 * - `start()` / `stop()` appellent l'endpoint et mettent à jour l'état
 *   localement avec la valeur serveur renvoyée.
 *
 * Paramètres :
 *   runId         : id du run
 *   initialTotalMs: total cumulé déjà acquis (total_ms renvoyé par GET runs)
 *   initialRunning: vrai si le run a un intervalle ouvert au chargement
 */
export default function useRunTimer({ runId, initialTotalMs = 0, initialRunning = false }) {
  const [baseMs, setBaseMs] = useState(initialTotalMs);
  const [running, setRunning] = useState(initialRunning);
  const [liveMs, setLiveMs] = useState(initialTotalMs);
  const [busy, setBusy] = useState(false);
  const runStartRef = useRef(running ? Date.now() : null);

  // Re-sync quand les props initiales changent (rafraîchissement liste).
  useEffect(() => {
    setBaseMs(initialTotalMs);
    setLiveMs(initialTotalMs);
    setRunning(initialRunning);
    runStartRef.current = initialRunning ? Date.now() : null;
  }, [runId, initialTotalMs, initialRunning]);

  // Ticker local — n'incrémente que lorsque l'onglet est visible pour économiser.
  useEffect(() => {
    if (!running) return undefined;
    if (runStartRef.current == null) runStartRef.current = Date.now();
    const tick = () => {
      if (document.visibilityState === 'hidden') return;
      const elapsed = Date.now() - runStartRef.current;
      setLiveMs(baseMs + elapsed);
    };
    tick();
    const id = setInterval(tick, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [running, baseMs]);

  // Heartbeat serveur — continue même en arrière-plan.
  useEffect(() => {
    if (!running || !runId) return undefined;
    let cancelled = false;
    const id = setInterval(async () => {
      if (cancelled) return;
      try { await runsApi.timer(runId, 'ping'); } catch { /* noop */ }
    }, PING_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [running, runId]);

  const start = useCallback(async () => {
    if (running || busy) return;
    setBusy(true);
    try {
      const res = await runsApi.timer(runId, 'start');
      setBaseMs(res.total_ms || 0);
      setLiveMs(res.total_ms || 0);
      runStartRef.current = Date.now();
      setRunning(Boolean(res.running));
    } finally {
      setBusy(false);
    }
  }, [runId, running, busy]);

  const stop = useCallback(async () => {
    if (!running || busy) return;
    setBusy(true);
    try {
      const res = await runsApi.timer(runId, 'stop');
      setBaseMs(res.total_ms || 0);
      setLiveMs(res.total_ms || 0);
      runStartRef.current = null;
      setRunning(Boolean(res.running));
    } finally {
      setBusy(false);
    }
  }, [runId, running, busy]);

  /** Synchronise l'état local depuis une réponse serveur (ex: après PATCH status). */
  const sync = useCallback(({ total_ms, running: r }) => {
    if (typeof total_ms === 'number') { setBaseMs(total_ms); setLiveMs(total_ms); }
    runStartRef.current = r ? Date.now() : null;
    setRunning(Boolean(r));
  }, []);

  return { elapsedMs: liveMs, running, busy, start, stop, sync };
}
