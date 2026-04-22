import { useCallback, useEffect, useMemo, useState } from 'react';
import { casesApi } from '../../api/resources.js';
import Button from '../shared/Button.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import ErrorBanner from '../shared/ErrorBanner.jsx';
import Spinner from '../shared/Spinner.jsx';
import CaseDetailPanel from './CaseDetailPanel.jsx';
import CaseFilters from './CaseFilters.jsx';
import CasesTable from './CasesTable.jsx';
import NewCaseDialog from './NewCaseDialog.jsx';

/**
 * Owner of the "cases" tab. Fetches cases for `planId`, manages filters and
 * the selected case, and renders the filter bar + table + optional detail
 * panel side-by-side.
 */
export default function CasesView({ planId }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('');
  const [status, setStatus] = useState('');
  const [sourceFilter, setSourceFilter] = useState('active');
  const [selectedId, setSelectedId] = useState(null);
  const [newCaseOpen, setNewCaseOpen] = useState(false);

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
      if (q) {
        const hay = `${c.id} ${c.title || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [cases, query, family, status, sourceFilter]);

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
          sourceFilter={sourceFilter} onSourceFilterChange={setSourceFilter}
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-fv-text-secondary tabular-nums">
            {filtered.length} / {cases.length}
          </span>
          <Button variant="primary" onClick={() => setNewCaseOpen(true)}>
            + Nouveau cas
          </Button>
        </div>
      </div>

      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="min-w-0 flex-1">
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
          <div className="w-[420px] shrink-0">
            <CaseDetailPanel
              planId={planId}
              caseItem={selectedCase}
              onClose={() => setSelectedId(null)}
              onUpdated={handleCaseUpdated}
            />
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
