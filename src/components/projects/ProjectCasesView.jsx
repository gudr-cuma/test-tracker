import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { projectsApi } from '../../api/resources.js';
import { STATUS_COLORS, STATUS_LABELS } from '../../engine/formatUtils.js';
import CaseDetailPanel from '../cases/CaseDetailPanel.jsx';
import ErrorBanner from '../shared/ErrorBanner.jsx';
import Spinner from '../shared/Spinner.jsx';

const PANEL_MIN = 320;
const PANEL_MAX = 900;
const PANEL_DEFAULT = 420;
const PANEL_KEY = 'test-tracker.projectPanelWidth';

function loadPanelWidth() {
  try {
    const n = Number(localStorage.getItem(PANEL_KEY));
    if (n >= PANEL_MIN && n <= PANEL_MAX) return n;
  } catch { /* noop */ }
  return PANEL_DEFAULT;
}

/**
 * Vue croisée : tous les cas d'un projet, groupés par famille puis par cas.
 *
 * Tableau : Cas de test | Runs (total) | Bugs (total) | Évolutions (total)
 * Niveau 1 : ligne famille (orange, repliable)
 * Niveau 2 : ligne cas avec sommes des compteurs sur tous les plans visibles
 * Niveau 3 : une ligne par plan, avec statut badge — clic → CaseDetailPanel
 */
export default function ProjectCasesView({ projectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtres
  const [query, setQuery] = useState('');
  const [familyFilter, setFamilyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('active');

  // État arborescence
  const [collapsedFamilies, setCollapsedFamilies] = useState(new Set());
  const [openCases, setOpenCases] = useState(new Set());

  // Panel détail : { planId, caseItem }
  const [selectedPanel, setSelectedPanel] = useState(null);

  // Resize du panel
  const [panelWidth, setPanelWidth] = useState(loadPanelWidth);
  const resizingRef = useRef(false);

  useEffect(() => {
    try { localStorage.setItem(PANEL_KEY, String(panelWidth)); } catch { /* noop */ }
  }, [panelWidth]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await projectsApi.getCases(projectId);
      setData(res);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const plans = data?.plans ?? [];
  const allCases = data?.cases ?? [];

  const families = useMemo(() => {
    const set = new Set(allCases.map((c) => c.family));
    return [...set].sort();
  }, [allCases]);

  const owners = useMemo(() => {
    const map = new Map();
    for (const p of plans) {
      if (p.owner_id && !map.has(p.owner_id)) map.set(p.owner_id, p.owner_name || p.owner_id);
    }
    return [...map.entries()];
  }, [plans]);

  const visiblePlans = useMemo(() => (
    userFilter ? plans.filter((p) => p.owner_id === userFilter) : plans
  ), [plans, userFilter]);

  const filteredCases = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allCases.filter((c) => {
      if (sourceFilter === 'active' && c.removed_from_md) return false;
      if (sourceFilter === 'removed' && !c.removed_from_md) return false;
      if (familyFilter && c.family !== familyFilter) return false;
      if (statusFilter) {
        const ok = visiblePlans.some((p) => (c.byPlan[p.id]?.latest_status || 'a-faire') === statusFilter);
        if (!ok) return false;
      }
      if (q && !`${c.id} ${c.title || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allCases, query, familyFilter, statusFilter, sourceFilter, visiblePlans]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const c of filteredCases) {
      if (!map.has(c.family)) map.set(c.family, { family: c.family, family_label: c.family_label, cases: [] });
      map.get(c.family).cases.push(c);
    }
    return [...map.values()];
  }, [filteredCases]);

  function toggleFamily(family) {
    setCollapsedFamilies((prev) => {
      const next = new Set(prev);
      next.has(family) ? next.delete(family) : next.add(family);
      return next;
    });
  }

  function toggleCase(caseId) {
    setOpenCases((prev) => {
      const next = new Set(prev);
      next.has(caseId) ? next.delete(caseId) : next.add(caseId);
      return next;
    });
  }

  function openPanel(plan, caseItem) {
    // Construire un caseItem enrichi avec les stats du plan sélectionné
    const ps = caseItem.byPlan[plan.id] || {};
    setSelectedPanel({
      planId: plan.id,
      caseItem: {
        ...caseItem,
        latest_status: ps.latest_status || 'a-faire',
        run_count: ps.run_count || 0,
        bug_count: ps.bug_count || 0,
        evolution_count: ps.evolution_count || 0,
      },
    });
  }

  function handleCaseUpdated(updated) {
    // Mettre à jour le caseItem dans data
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        cases: prev.cases.map((c) =>
          c.id === updated.id ? { ...c, ...updated, byPlan: c.byPlan } : c,
        ),
      };
    });
    // Mettre à jour le panel si ouvert
    setSelectedPanel((prev) => prev && prev.caseItem.id === updated.id
      ? { ...prev, caseItem: { ...prev.caseItem, ...updated } }
      : prev,
    );
  }

  // Resize handle
  function startResize(e) {
    e.preventDefault();
    resizingRef.current = true;
    const startX = e.clientX;
    const startW = panelWidth;
    function onMove(ev) {
      const next = Math.min(PANEL_MAX, Math.max(PANEL_MIN, startW + (startX - ev.clientX)));
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
    if (e.key === 'ArrowLeft') { e.preventDefault(); setPanelWidth((w) => Math.min(PANEL_MAX, w + 24)); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setPanelWidth((w) => Math.max(PANEL_MIN, w - 24)); }
  }

  if (loading && !data) {
    return <div className="flex items-center justify-center py-16"><Spinner size={28} /></div>;
  }
  if (error) return <ErrorBanner message={error} onRetry={load} />;

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Rechercher par ID ou titre…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-[200px] flex-1 rounded-md border border-fv-border bg-white px-3 py-1.5 text-sm focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange"
        />
        <select value={familyFilter} onChange={(e) => setFamilyFilter(e.target.value)}
          className="rounded-md border border-fv-border bg-white px-2.5 py-1.5 text-sm focus:border-fv-orange focus:outline-none">
          <option value="">Toutes familles</option>
          {families.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-fv-border bg-white px-2.5 py-1.5 text-sm focus:border-fv-orange focus:outline-none">
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {owners.length > 1 ? (
          <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}
            className="rounded-md border border-fv-border bg-white px-2.5 py-1.5 text-sm focus:border-fv-orange focus:outline-none">
            <option value="">Tous les utilisateurs</option>
            {owners.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        ) : null}
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-md border border-fv-border bg-white px-2.5 py-1.5 text-sm focus:border-fv-orange focus:outline-none">
          <option value="active">Actifs</option>
          <option value="removed">Retirés</option>
          <option value="all">Tout</option>
        </select>
        <span className="text-xs text-fv-text-secondary tabular-nums">
          {filteredCases.length} / {allCases.length} cas
        </span>
      </div>

      {/* Split-pane : table à gauche, panel à droite */}
      <div className="flex min-h-0 flex-1 gap-0">
        <div className="min-w-0 flex-1 overflow-y-auto pr-0">
          {plans.length === 0 ? (
            <div className="rounded-md border border-dashed border-fv-border bg-white p-8 text-center text-sm text-fv-text-secondary">
              Ce projet n&rsquo;a aucun cahier de test.
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="rounded-md border border-dashed border-fv-border bg-white p-8 text-center text-sm text-fv-text-secondary">
              Aucun cas ne correspond aux filtres.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-fv-border bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-fv-border bg-fv-bg-secondary text-xs font-semibold uppercase tracking-wide text-fv-text-secondary">
                    <th className="px-3 py-2 text-left">Cas de test</th>
                    <th className="px-3 py-2 text-right whitespace-nowrap">Runs</th>
                    <th className="px-3 py-2 text-right whitespace-nowrap">Bugs</th>
                    <th className="px-3 py-2 text-right whitespace-nowrap">Évolutions</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map(({ family, family_label, cases }) => (
                    <FamilyGroup
                      key={family}
                      family={family}
                      familyLabel={family_label}
                      cases={cases}
                      visiblePlans={visiblePlans}
                      collapsed={collapsedFamilies.has(family)}
                      openCases={openCases}
                      selectedPanel={selectedPanel}
                      onToggleFamily={() => toggleFamily(family)}
                      onToggleCase={toggleCase}
                      onOpenPanel={openPanel}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Panel détail */}
        {selectedPanel ? (
          <div className="flex shrink-0" style={{ width: panelWidth, position: 'sticky', top: 0, maxHeight: '100vh', overflowY: 'auto' }}>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Redimensionner le panneau"
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
                planId={selectedPanel.planId}
                caseItem={selectedPanel.caseItem}
                onClose={() => setSelectedPanel(null)}
                onUpdated={handleCaseUpdated}
                onRunsChanged={load}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FamilyGroup({ family, familyLabel, cases, visiblePlans, collapsed, openCases, selectedPanel, onToggleFamily, onToggleCase, onOpenPanel }) {
  // Totaux de la famille sur tous les plans visibles
  const totals = cases.reduce(
    (acc, c) => {
      for (const p of visiblePlans) {
        const ps = c.byPlan[p.id];
        if (ps) { acc.runs += ps.run_count; acc.bugs += ps.bug_count; acc.evols += ps.evolution_count; }
      }
      return acc;
    },
    { runs: 0, bugs: 0, evols: 0 },
  );

  return (
    <>
      <tr className="cursor-pointer bg-orange-50 hover:bg-orange-100" onClick={onToggleFamily}>
        <td className="px-3 py-2 font-semibold text-fv-text-secondary" colSpan={4}>
          <span className="mr-2 select-none">{collapsed ? '▶' : '▼'}</span>
          <span className="font-mono text-xs">{family}</span>
          {familyLabel ? <span className="ml-1.5 text-xs font-normal text-fv-text-secondary/70">— {familyLabel}</span> : null}
          <span className="ml-2 text-xs font-normal text-fv-text-secondary/60">({cases.length} cas)</span>
        </td>
      </tr>

      {!collapsed && cases.map((c) => (
        <CaseGroup
          key={c.id}
          caseItem={c}
          visiblePlans={visiblePlans}
          isOpen={openCases.has(c.id)}
          isSelected={selectedPanel?.caseItem?.id === c.id}
          onToggle={() => onToggleCase(c.id)}
          onOpenPanel={onOpenPanel}
        />
      ))}
    </>
  );
}

function CaseGroup({ caseItem, visiblePlans, isOpen, isSelected, onToggle, onOpenPanel }) {
  // Sommes sur les plans visibles
  const totals = visiblePlans.reduce(
    (acc, p) => {
      const ps = caseItem.byPlan[p.id];
      if (ps) { acc.runs += ps.run_count; acc.bugs += ps.bug_count; acc.evols += ps.evolution_count; }
      return acc;
    },
    { runs: 0, bugs: 0, evols: 0 },
  );

  return (
    <>
      {/* Ligne cas — niveau 2 */}
      <tr
        className={[
          'cursor-pointer border-t border-fv-border/50',
          isSelected ? 'bg-fv-orange-light/20' : 'hover:bg-fv-bg-secondary/40',
        ].join(' ')}
        onClick={onToggle}
      >
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="select-none text-fv-text-secondary text-xs">{isOpen ? '▾' : '▸'}</span>
            <span className="font-mono text-xs text-fv-text-secondary">{caseItem.id}</span>
            <span className="text-fv-text">{caseItem.title}</span>
          </div>
        </td>
        <td className="px-3 py-2 text-right tabular-nums text-xs text-fv-text-secondary">{totals.runs || '—'}</td>
        <td className="px-3 py-2 text-right tabular-nums text-xs">
          {totals.bugs > 0 ? <span className="font-medium text-fv-red">{totals.bugs}</span> : <span className="text-fv-text-secondary">—</span>}
        </td>
        <td className="px-3 py-2 text-right tabular-nums text-xs">
          {totals.evols > 0 ? <span className="font-medium text-purple-600">{totals.evols}</span> : <span className="text-fv-text-secondary">—</span>}
        </td>
      </tr>

      {/* Lignes par plan — niveau 3, visibles quand le cas est ouvert */}
      {isOpen && visiblePlans.map((p) => {
        const ps = caseItem.byPlan[p.id];
        const status = ps?.latest_status || 'a-faire';
        const isThisSelected = false; // on garde la surbrillance au niveau 2
        return (
          <tr
            key={p.id}
            className="cursor-pointer border-t border-fv-border/20 bg-fv-bg-secondary/30 hover:bg-fv-orange-light/10"
            onClick={(e) => { e.stopPropagation(); onOpenPanel(p, caseItem); }}
          >
            <td className="py-1.5 pl-10 pr-3" colSpan={4}>
              <div className="flex items-center gap-2">
                <span className="text-xs text-fv-text-secondary">👤 {p.owner_name || p.title}</span>
                <span className="text-xs text-fv-text-secondary/50">·</span>
                <span className="truncate text-xs text-fv-text-secondary/70">{p.title}</span>
                {ps ? <StatusBadge status={status} /> : <span className="text-xs italic text-fv-text-secondary/40">non présent</span>}
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}

function StatusBadge({ status }) {
  const cls = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
