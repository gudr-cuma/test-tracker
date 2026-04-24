import { useCallback, useEffect, useState } from 'react';
import { runsApi } from '../../api/resources.js';
import { formatDateTime, formatDuration } from '../../engine/formatUtils.js';
import useRunTimer from '../../hooks/useRunTimer.js';
import { useStore } from '../../store/useStore.js';
import CommentsPanel from '../comments/CommentsPanel.jsx';
import Button from '../shared/Button.jsx';
import ErrorBanner from '../shared/ErrorBanner.jsx';
import Spinner from '../shared/Spinner.jsx';
import StatusSelect from './StatusSelect.jsx';

/**
 * Runs panel for the currently-selected case. Drives its own data
 * lifecycle. When a run is created / updated / deleted, it invokes
 * `onChanged` so the parent can refresh the cases list aggregates.
 */
export default function RunsTimeline({ planId, caseId, checklist = [], onChanged, onRunsChange }) {
  const showToast = useStore((s) => s.showToast);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyIds, setBusyIds] = useState(new Set());
  const [creating, setCreating] = useState(false);

  useEffect(() => { onRunsChange?.(runs); }, [runs, onRunsChange]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await runsApi.list(planId, caseId);
      setRuns(res.runs || []);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [planId, caseId]);

  useEffect(() => { reload(); }, [reload]);

  function markBusy(id, on) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const patchLocal = useCallback((id, patch) => {
    setRuns((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const res = await runsApi.create(planId, caseId, { status: 'a-faire' });
      setRuns((prev) => [res.run, ...prev]);
      showToast('success', 'Run créé.');
      onChanged?.();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(run, nextStatus) {
    if (run.status === nextStatus) return;
    markBusy(run.id, true);
    try {
      const res = await runsApi.update(run.id, { status: nextStatus });
      // On refetch pour récupérer total_ms/running à jour.
      await reload();
      onChanged?.();
      return res.run;
    } catch (e) {
      showToast('error', `Changement de statut impossible : ${e.message || e}`);
    } finally {
      markBusy(run.id, false);
    }
    return null;
  }

  async function handleBugUrlChange(run, url) {
    markBusy(run.id, true);
    try {
      const res = await runsApi.update(run.id, { bug_url: url });
      patchLocal(run.id, res.run);
    } catch (e) {
      showToast('error', `Sauvegarde de l'URL impossible : ${e.message || e}`);
    } finally {
      markBusy(run.id, false);
    }
  }

  async function handleChecklistSet(run, itemId, next) {
    markBusy(run.id, true);
    try {
      await runsApi.setChecklistItem(run.id, itemId, next);
      // L'auto-transition peut changer status / total_ms / running → on recharge.
      await reload();
      onChanged?.();
    } catch (e) {
      showToast('error', `Mise à jour impossible : ${e.message || e}`);
    } finally {
      markBusy(run.id, false);
    }
  }

  async function handleDelete(run) {
    if (!window.confirm('Supprimer ce run ?')) return;
    markBusy(run.id, true);
    try {
      await runsApi.delete(run.id);
      setRuns((prev) => prev.filter((r) => r.id !== run.id));
      showToast('success', 'Run supprimé.');
      onChanged?.();
    } catch (e) {
      showToast('error', `Suppression impossible : ${e.message || e}`);
    } finally {
      markBusy(run.id, false);
    }
  }

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-fv-text-secondary">
          Runs ({runs.length})
        </h3>
        <Button variant="primary" size="sm" disabled={creating} onClick={handleCreate}>
          {creating ? <Spinner size={12} /> : '+'} Nouveau run
        </Button>
      </div>

      {error ? (
        <div className="mb-2">
          <ErrorBanner message={error} onRetry={reload} />
        </div>
      ) : null}

      {loading && runs.length === 0 ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-md border border-dashed border-fv-border bg-fv-bg-secondary px-4 py-6 text-center text-sm text-fv-text-secondary">
          Aucun run pour l&rsquo;instant. Démarre un run pour commencer le suivi.
        </div>
      ) : (
        <ol className="space-y-2">
          {runs.map((run) => (
            <RunRow
              key={run.id}
              run={run}
              checklist={checklist}
              busy={busyIds.has(run.id)}
              onStatusChange={(s) => handleStatusChange(run, s)}
              onChecklistSet={(itemId, next) => handleChecklistSet(run, itemId, next)}
              onBugUrlChange={(url) => handleBugUrlChange(run, url)}
              onDelete={() => handleDelete(run)}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function RunRow({ run, checklist = [], busy, onStatusChange, onChecklistSet, onDelete, onBugUrlChange }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(null);
  const [urlDraft, setUrlDraft] = useState(run.bug_url || '');
  const [urlBusy, setUrlBusy] = useState(false);
  const timer = useRunTimer({
    runId: run.id,
    initialTotalMs: run.total_ms || 0,
    initialRunning: Boolean(run.running),
  });

  useEffect(() => { setUrlDraft(run.bug_url || ''); }, [run.bug_url]);

  async function saveUrl() {
    const trimmed = urlDraft.trim();
    if (trimmed === (run.bug_url || '')) return;
    setUrlBusy(true);
    try {
      await onBugUrlChange(trimmed || null);
    } finally {
      setUrlBusy(false);
    }
  }

  // Index des résultats checklist par item_id
  const resultsByItem = {};
  for (const r of run.checklist_results || []) resultsByItem[r.item_id] = r;

  const hasChecklist = checklist.length > 0;

  return (
    <li className="rounded-md border border-fv-border bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusSelect
            value={run.status}
            onChange={onStatusChange}
            disabled={busy}
            size="sm"
          />
          <TimerBadge timer={timer} disabled={busy || run.status === 'clos'} />
          {busy ? <Spinner size={12} /> : null}
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          aria-label="Supprimer le run"
          className="rounded p-1 text-fv-text-secondary hover:bg-red-50 hover:text-fv-red disabled:opacity-50"
          title="Supprimer le run"
        >
          <span aria-hidden="true">🗑</span>
        </button>
      </div>

      {hasChecklist ? (
        <ul className="mt-3 divide-y divide-fv-border/40 rounded-md border border-fv-border">
          {checklist.map((item, idx) => (
            <ChecklistItemRow
              key={item.id}
              index={idx}
              item={item}
              current={resultsByItem[item.id] || null}
              disabled={busy}
              onSet={(next) => onChecklistSet(item.id, next)}
            />
          ))}
        </ul>
      ) : (
        <div className="mt-2 rounded border border-dashed border-fv-border bg-fv-bg-secondary px-2 py-2 text-xs text-fv-text-secondary">
          Aucune checklist sur ce cas.
        </div>
      )}

      {/* URL globale du run — toujours accessible, utile quand on veut lier un
          ticket à l'ensemble du run (et non à un point précis). */}
      <div className="mt-3 flex items-center gap-1.5">
        <span className="text-xs font-medium text-fv-text-secondary shrink-0">URL globale</span>
        <input
          type="url"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onBlur={saveUrl}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveUrl(); } }}
          placeholder="Lien sprint / ticket / rapport…"
          disabled={urlBusy}
          className="min-w-0 flex-1 rounded-md border border-fv-border px-2.5 py-1 text-xs text-fv-text placeholder:text-fv-text-secondary/60 focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange disabled:opacity-60"
        />
        {urlDraft.trim() ? (
          <a
            href={urlDraft.trim()}
            target="_blank"
            rel="noopener noreferrer"
            title="Ouvrir"
            className="shrink-0 rounded-md border border-fv-border bg-white px-2 py-1 text-xs font-medium text-fv-text-secondary transition hover:border-fv-orange hover:text-fv-orange"
          >
            Ouvrir →
          </a>
        ) : null}
        {urlBusy ? <Spinner size={12} /> : null}
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-fv-text-secondary">
        <MetaRow label="Créé" value={formatDateTime(run.created_at)} />
        <MetaRow label="Testeur" value={run.tester_name || '—'} />
        <MetaRow label="Démarré" value={formatDateTime(run.started_at)} />
        <MetaRow label="Terminé" value={formatDateTime(run.completed_at)} />
      </dl>

      <button
        type="button"
        onClick={() => setCommentsOpen((v) => !v)}
        className="mt-2 inline-flex items-center gap-1 rounded px-1 text-xs font-medium text-fv-text-secondary hover:text-fv-orange focus:outline-none focus-visible:ring-1 focus-visible:ring-fv-orange"
        aria-expanded={commentsOpen}
      >
        <span aria-hidden="true">{commentsOpen ? '▾' : '▸'}</span>
        Commentaires{commentCount != null ? ` (${commentCount})` : ''}
      </button>

      {commentsOpen ? (
        <CommentsPanel
          targetType="run"
          targetId={run.id}
          compact
          onCountChange={setCommentCount}
        />
      ) : null}
    </li>
  );
}

function ChecklistItemRow({ index, item, current, disabled, onSet }) {
  const [urlDraft, setUrlDraft] = useState(current?.url || '');
  const [urlBusy, setUrlBusy] = useState(false);

  useEffect(() => { setUrlDraft(current?.url || ''); }, [current?.url]);

  const result = current?.result || null;

  function toggle(target) {
    // 3ᵉ clic sur la coche active = désélection (revient à "non évalué").
    const next = result === target ? null : target;
    onSet({ result: next, url: urlDraft.trim() || null });
  }

  async function saveUrl() {
    const trimmed = urlDraft.trim();
    if (trimmed === (current?.url || '')) return;
    if (!result) {
      // Pas de résultat → on ne sauve pas d'URL orpheline ; on reset le draft.
      setUrlDraft('');
      return;
    }
    setUrlBusy(true);
    try {
      onSet({ result, url: trimmed || null });
    } finally {
      setUrlBusy(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-2 px-2 py-1.5 text-xs">
      <span className="w-5 shrink-0 text-right tabular-nums font-medium text-fv-text-secondary">
        {index + 1}.
      </span>
      <span className="min-w-0 flex-1 text-fv-text">{item.label}</span>

      <div className="flex shrink-0 gap-1">
        <CheckCell
          variant="ok"
          checked={result === 'ok'}
          onClick={() => toggle('ok')}
          disabled={disabled}
        />
        <CheckCell
          variant="nok"
          checked={result === 'nok'}
          onClick={() => toggle('nok')}
          disabled={disabled}
        />
      </div>

      <div className="flex w-full items-center gap-1.5 sm:w-64 sm:shrink-0">
        <input
          type="url"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onBlur={saveUrl}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveUrl(); } }}
          placeholder={result ? 'URL du ticket…' : '(évaluez d\'abord)'}
          disabled={disabled || !result}
          className="min-w-0 flex-1 rounded border border-fv-border px-1.5 py-0.5 text-[11px] text-fv-text placeholder:text-fv-text-secondary/60 focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange disabled:opacity-50"
        />
        {urlDraft.trim() ? (
          <a
            href={urlDraft.trim()}
            target="_blank"
            rel="noopener noreferrer"
            title="Ouvrir"
            className="shrink-0 text-fv-text-secondary hover:text-fv-orange"
          >
            🔗
          </a>
        ) : null}
        {urlBusy ? <Spinner size={10} /> : null}
      </div>
    </li>
  );
}

function CheckCell({ variant, checked, onClick, disabled }) {
  const isOk = variant === 'ok';
  const label = isOk ? 'OK' : 'NOK';
  const activeCls = isOk
    ? 'bg-fv-green-light border-fv-green text-fv-green-dark'
    : 'bg-red-50 border-fv-red text-fv-red';
  const idleCls = 'border-fv-border text-fv-text-secondary hover:border-fv-text';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={checked}
      title={checked ? `Désélectionner ${label}` : `Marquer ${label}`}
      className={[
        'inline-flex h-6 w-9 items-center justify-center rounded border text-[11px] font-semibold tabular-nums transition',
        checked ? activeCls : idleCls,
        disabled ? 'opacity-50' : '',
      ].join(' ')}
    >
      {checked ? (isOk ? '✓ OK' : '✗ NOK') : label}
    </button>
  );
}

function TimerBadge({ timer, disabled }) {
  const { elapsedMs, running, busy, start, stop } = timer;
  const handle = () => { if (running) stop(); else start(); };
  return (
    <button
      type="button"
      onClick={handle}
      disabled={disabled || busy}
      title={running ? 'Mettre le timer en pause' : 'Démarrer le timer'}
      className={[
        'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium tabular-nums transition',
        running
          ? 'border-fv-orange bg-fv-orange-light text-fv-orange-dark'
          : 'border-fv-border bg-white text-fv-text-secondary hover:border-fv-orange hover:text-fv-orange',
        disabled || busy ? 'opacity-50' : '',
      ].join(' ')}
    >
      <span aria-hidden="true">{running ? '⏸' : '▶'}</span>
      <span aria-hidden="true">⏱</span>
      <span>{formatDuration(elapsedMs)}</span>
    </button>
  );
}

function MetaRow({ label, value }) {
  return (
    <>
      <dt className="font-medium">{label}</dt>
      <dd className="tabular-nums text-fv-text">{value || '—'}</dd>
    </>
  );
}
