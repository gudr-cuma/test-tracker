import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { casesApi } from '../../api/resources.js';
import { useStore, selectCurrentPlan } from '../../store/useStore.js';
import { exportCasesToXlsx } from '../../lib/exportXlsx.js';
import Button from '../shared/Button.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import ErrorBanner from '../shared/ErrorBanner.jsx';
import Spinner from '../shared/Spinner.jsx';
import CaseDetailPanel from './CaseDetailPanel.jsx';
import CaseFilters from './CaseFilters.jsx';
import CasesTable from './CasesTable.jsx';
import NewCaseDialog from './NewCaseDialog.jsx';

const PANEL_WIDTH_KEY = 'test-tracker.detailPanelWidth';
const PANEL_MIN = 320;
const PANEL_MAX = 900;
const PANEL_DEFAULT = 420;

function loadPanelWidth() {
  try {
    const n = Number(localStorage.getItem(PANEL_WIDTH_KEY));
    if (n >= PANEL_MIN && n <= PANEL_MAX) return n;
  } catch {
    /* localStorage non dispo (mode privé strict) → fallback. */
  }
  return PANEL_DEFAULT;
}

/**
 * Owner of the "cases" tab. Fetches cases for `planId`, manages filters and
 * the selected case, and renders the filter bar + table + optional detail
 * panel side-by-side. Detail panel width is user-resizable via a drag handle
 * and persisted in localStorage.
 */
export default function CasesView({ planId }) {
  const plan = useStore(selectCurrentPlan);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('');
  const [status, setStatus] = useState('');
  const [bugFilter, setBugFilter] = useState(''); // '' | 'with' | 'without'
  const [sourceFilter, setSourceFilter] = useState('active');
  const [selectedId, setSelectedId] = useState(null);
  const [newCaseOpen, setNewCaseOpen] = useState(false);

  const [panelWidth, setPanelWidth] = useState(loadPanelWidth);
  const resizingRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(PANEL_WIDTH_KEY, String(panelWidth));
    } catch {
      /* ignore */
    }
  }, [panelWidth]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await casesApi.list(planId);
      setCases(res.cases || []);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases.filter((c) => {
      // Source filter
      if (sourceFilter === 'active' && c.removed_from_md) return false;
      if (sourceFilter === 'markdown' && (c.removed_from_md || c.source !== 'markdown'))
        return false;
      if (sourceFilter === 'manual' && c.source !== 'manual') return false;
      if (sourceFilter === 'removed' && !c.removed_from_md) return false;

      if (family && c.family !== family) return false;
      if (status) {
        const cur = c.latest_status || 'a-faire';
        if (cur !== status) return false;
      }

      // Bug filter : agrège bug_count (nb runs en statut bug).
      const bugs = c.bug_count || 0;
      if (bugFilter === 'with' && bugs <= 0) return false;
      if (bugFilter === 'without' && bugs > 0) return false;

      if (q) {
        const hay = `${c.id} ${c.title || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [cases, query, family, status, bugFilter, sourceFilter]);

  const selectedCase = useMemo(
    () => cases.find((c) => c.id === selectedId) || null,
    [cases, selectedId],
  );

  function handleCaseUpdated(updated) {
    setCases((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
  }

  function handleCaseCreated() {
    // Easier to just refetch — server-side aggregates (run_count, etc.) stay in sync.
    reload();
  }

  // --- Redimensionnement du panel droit -----------------------------------
  // On garde les handlers au niveau window (pas sur la poignée) pour que la
  // souris puisse quitter la poignée pendant le drag sans interrompre le geste.
  function startResize(e) {
    e.preventDefault();
    resizingRef.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;

    function onMove(ev) {
      // Tirer vers la gauche élargit le panel (il est ancré à droite).
      const delta = startX - ev.clientX;
      const next = Math.min(PANEL_MAX, Math.max(PANEL_MIN, startWidth + delta));
      setPanelWidth(next);
    }

    function onUp() {
      resizingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  function handleResizeKey(e) {
    // Accessibilité : flèches gauche/droite ajustent par pas de 24 px.
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setPanelWidth((w) => Math.min(PANEL_MAX, w + 24));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setPanelWidth((w) => Math.max(PANEL_MIN, w - 24));
    }
  }

  if (loading && cases.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size={28} />
      </div>
    );
  }

  if (error && cases.length === 0) {
    return <ErrorBanner message={error} onRetry={reload} />;
  }

  if (cases.length === 0) {
    return (
      <>
        <EmptyState
          title="Aucun cas dans ce cahier"
          description="Importe un markdown via « Importer un cahier », ou crée un cas manuel ci-dessous."
          action={
            <Button variant="primary" onClick={() => setNewCaseOpen(true)}>
              + Nouveau cas
            </Button>
          }
        />
        {newCaseOpen ? (
          <NewCaseDialog
            planId={planId}
            existingCases={cases}
            onCreated={handleCaseCreated}
            onClose={() => setNewCaseOpen(false)}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CaseFilters
          cases={cases}
          query={query} onQueryChange={setQuery}
          family={family} onFamilyChange={setFamily}
          status={status} onStatusChange={setStatus}
          bugFilter={bugFilter} onBugFilterChange={setBugFilter}
          sourceFilter={sourceFilter} onSourceFilterChange={setSourceFilter}
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-fv-text-secondary tabular-nums">
            {filtered.length} / {cases.length}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportCasesToXlsx(plan?.title ?? 'plan', cases.filter((c) => !c.removed_from_md))}
          >
            ⬇ Export xlsx
          </Button>
          <Button variant="primary" onClick={() => setNewCaseOpen(true)}>
            + Nouveau cas
          </Button>
        </div>
      </div>

      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

      <div className="flex min-h-0 flex-1 gap-0">
        <div className="min-w-0 flex-1 pr-4">
          {filtered.length === 0 ? (
            <div className="rounded-md border border-dashed border-fv-border bg-white p-8 text-center text-sm text-fv-text-secondary">
              Aucun cas ne correspond aux filtres.
            </div>
          ) : (
            <CasesTable
              cases={filtered}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>

        {selectedCase ? (
          <div className="flex shrink-0" style={{ width: panelWidth }}>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Redimensionner le panneau"
              aria-valuenow={panelWidth}
              aria-valuemin={PANEL_MIN}
              aria-valuemax={PANEL_MAX}
              tabIndex={0}
              onMouseDown={startResize}
              onKeyDown={handleResizeKey}
              title="Glisser pour redimensionner"
              className="group relative -mr-1 w-2 shrink-0 cursor-col-resize"
            >
              <span className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-fv-border transition-colors group-hover:bg-fv-orange group-focus:bg-fv-orange" />
            </div>
            <div className="min-w-0 flex-1">
              <CaseDetailPanel
                planId={planId}
                caseItem={selectedCase}
                onClose={() => setSelectedId(null)}
                onUpdated={handleCaseUpdated}
                onRunsChanged={reload}
              />
            </div>
          </div>
        ) : null}
      </div>

      {newCaseOpen ? (
        <NewCaseDialog
          planId={planId}
          existingCases={cases}
          onCreated={handleCaseCreated}
          onClose={() => setNewCaseOpen(false)}
        />
      ) : null}
    </div>
  );
}
