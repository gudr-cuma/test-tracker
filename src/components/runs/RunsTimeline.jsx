import { useCallback, useEffect, useState } from 'react';
import { runsApi } from '../../api/resources.js';
import { formatDateTime } from '../../engine/formatUtils.js';
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
export default function RunsTimeline({ planId, caseId, onChanged, onRunsChange }) {
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

  useEffect(() => {
    reload();
  }, [reload]);

  function markBusy(id, on) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

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
      setRuns((prev) => prev.map((r) => (r.id === run.id ? res.run : r)));
      onChanged?.();
    } catch (e) {
      showToast('error', `Changement de statut impossible : ${e.message || e}`);
    } finally {
      markBusy(run.id, false);
    }
  }

  async function handleDelete(run) {
    if (!window.confirm(`Supprimer ce run (${runStatusLabel(run.status)}) ?`)) return;
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
              busy={busyIds.has(run.id)}
              onStatusChange={(s) => handleStatusChange(run, s)}
              onDelete={() => handleDelete(run)}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function RunRow({ run, busy, onStatusChange, onDelete }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(null);

  return (
    <li className="rounded-md border border-fv-border bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <StatusSelect
            value={run.status}
            onChange={onStatusChange}
            disabled={busy}
            size="sm"
          />
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

function MetaRow({ label, value }) {
  return (
    <>
      <dt className="font-medium">{label}</dt>
      <dd className="tabular-nums text-fv-text">{value || '—'}</dd>
    </>
  );
}

function runStatusLabel(status) {
  return (
    {
      'a-faire': 'à faire',
      'en-cours': 'en cours',
      fait: 'fait',
      bug: 'bug',
      'en-pause': 'en pause',
      clos: 'clos',
    }[status] || status
  );
}
