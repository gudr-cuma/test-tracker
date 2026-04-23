import { useCallback, useEffect, useMemo, useState } from 'react';
import { projectsApi } from '../../api/resources.js';
import { STATUS_COLORS, STATUS_LABELS } from '../../engine/formatUtils.js';
import ErrorBanner from '../shared/ErrorBanner.jsx';
import Spinner from '../shared/Spinner.jsx';

/**
 * Vue croisée : tous les cas de test d'un projet, groupés par famille puis par cas,
 * avec pour chaque cas une ligne par plan (propriétaire + statut + run count).
 */
export default function ProjectCasesView({ projectId }) {
  const [data, setData] = useState(null); // { plans, cases }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtres
  const [query, setQuery] = useState('');
  const [familyFilter, setFamilyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('active');

  // État collapse des familles et des cas
  const [collapsedFamilies, setCollapsedFamilies] = useState(new Set());
  const [openCases, setOpenCases] = useState(new Set());

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

  // Liste des familles disponibles
  const families = useMemo(() => {
    const set = new Set(allCases.map((c) => c.family));
    return [...set].sort();
  }, [allCases]);

  // Liste des propriétaires disponibles (depuis les plans)
  const owners = useMemo(() => {
    const map = new Map();
    for (const p of plans) {
      if (p.owner_id && !map.has(p.owner_id)) map.set(p.owner_id, p.owner_name || p.owner_id);
    }
    return [...map.entries()]; // [[id, name], ...]
  }, [plans]);

  // Plans filtrés par utilisateur sélectionné
  const visiblePlans = useMemo(() => {
    if (!userFilter) return plans;
    return plans.filter((p) => p.owner_id === userFilter);
  }, [plans, userFilter]);

  // Cas filtrés
  const filteredCases = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allCases.filter((c) => {
      if (sourceFilter === 'active' && c.removed_from_md) return false;
      if (sourceFilter === 'removed' && !c.removed_from_md) return false;
      if (familyFilter && c.family !== familyFilter) return false;
      if (statusFilter) {
        // Garder si au moins un plan visible a ce statut
        const matchesStatus = visiblePlans.some((p) => {
          const s = c.byPlan[p.id]?.latest_status || 'a-faire';
          return s === statusFilter;
        });
        if (!matchesStatus) return false;
      }
      if (q) {
        const hay = `${c.id} ${c.title || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allCases, query, familyFilter, statusFilter, sourceFilter, visiblePlans]);

  // Grouper par famille
  const grouped = useMemo(() => {
    const map = new Map();
    for (const c of filteredCases) {
      if (!map.has(c.family)) {
        map.set(c.family, { family: c.family, family_label: c.family_label, cases: [] });
      }
      map.get(c.family).cases.push(c);
    }
    return [...map.values()];
  }, [filteredCases]);

  function toggleFamily(family) {
    setCollapsedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(family)) next.delete(family);
      else next.add(family);
      return next;
    });
  }

  function toggleCase(caseId) {
    setOpenCases((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) next.delete(caseId);
      else next.add(caseId);
      return next;
    });
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size={28} />
      </div>
    );
  }

  if (error) return <ErrorBanner message={error} onRetry={load} />;

  return (
    <div className="flex flex-col gap-3">
      {/* Barre de filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Rechercher par ID ou titre…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-[200px] flex-1 rounded-md border border-fv-border bg-white px-3 py-1.5 text-sm focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange"
        />
        <select
          value={familyFilter}
          onChange={(e) => setFamilyFilter(e.target.value)}
          className="rounded-md border border-fv-border bg-white px-2.5 py-1.5 text-sm focus:border-fv-orange focus:outline-none"
        >
          <option value="">Toutes familles</option>
          {families.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-fv-border bg-white px-2.5 py-1.5 text-sm focus:border-fv-orange focus:outline-none"
        >
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        {owners.length > 1 ? (
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="rounded-md border border-fv-border bg-white px-2.5 py-1.5 text-sm focus:border-fv-orange focus:outline-none"
          >
            <option value="">Tous les utilisateurs</option>
            {owners.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        ) : null}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-md border border-fv-border bg-white px-2.5 py-1.5 text-sm focus:border-fv-orange focus:outline-none"
        >
          <option value="active">Actifs</option>
          <option value="removed">Retirés</option>
          <option value="all">Tout</option>
        </select>
        <span className="text-xs text-fv-text-secondary tabular-nums">
          {filteredCases.length} / {allCases.length} cas
        </span>
      </div>

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
                <th className="px-3 py-2 text-left">Cas</th>
                {visiblePlans.map((p) => (
                  <th key={p.id} className="px-3 py-2 text-center whitespace-nowrap">
                    <div>{p.title}</div>
                    {p.owner_name ? (
                      <div className="mt-0.5 text-[10px] font-normal normal-case text-fv-text-secondary/70">
                        👤 {p.owner_name}
                      </div>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map(({ family, family_label, cases }) => (
                <FamilyGroup
                  key={family}
                  family={family}
                  familyLabel={family_label}
                  cases={cases}
                  plans={visiblePlans}
                  collapsed={collapsedFamilies.has(family)}
                  openCases={openCases}
                  onToggleFamily={() => toggleFamily(family)}
                  onToggleCase={toggleCase}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FamilyGroup({ family, familyLabel, cases, plans, collapsed, openCases, onToggleFamily, onToggleCase }) {
  return (
    <>
      {/* Ligne famille */}
      <tr
        className="cursor-pointer bg-orange-50 hover:bg-orange-100"
        onClick={onToggleFamily}
      >
        <td
          className="px-3 py-2 font-semibold text-fv-text-secondary"
          colSpan={plans.length + 1}
        >
          <span className="mr-2 select-none">{collapsed ? '▶' : '▼'}</span>
          <span className="font-mono text-xs">{family}</span>
          {familyLabel ? (
            <span className="ml-1.5 text-xs font-normal text-fv-text-secondary/70">
              — {familyLabel}
            </span>
          ) : null}
          <span className="ml-2 text-xs font-normal text-fv-text-secondary/60">
            ({cases.length} cas)
          </span>
        </td>
      </tr>

      {!collapsed && cases.map((c) => (
        <CaseGroup
          key={c.id}
          caseItem={c}
          plans={plans}
          isOpen={openCases.has(c.id)}
          onToggle={() => onToggleCase(c.id)}
        />
      ))}
    </>
  );
}

function CaseGroup({ caseItem, plans, isOpen, onToggle }) {
  return (
    <>
      {/* Ligne cas (niveau 2) */}
      <tr
        className="cursor-pointer border-t border-fv-border/50 hover:bg-fv-bg-secondary/40"
        onClick={onToggle}
      >
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="select-none text-fv-text-secondary">{isOpen ? '▾' : '▸'}</span>
            <span className="font-mono text-xs text-fv-text-secondary">{caseItem.id}</span>
            <span className="text-fv-text">{caseItem.title}</span>
          </div>
        </td>
        {/* Résumé statut par plan (quand replié) */}
        {plans.map((p) => {
          const ps = caseItem.byPlan[p.id];
          if (!ps) return <td key={p.id} className="px-3 py-2 text-center text-xs text-fv-text-secondary/40">—</td>;
          const status = ps.latest_status || 'a-faire';
          return (
            <td key={p.id} className="px-3 py-2 text-center">
              <StatusBadge status={status} />
            </td>
          );
        })}
      </tr>

      {/* Lignes détail par plan (niveau 3) */}
      {isOpen && plans.map((p) => {
        const ps = caseItem.byPlan[p.id];
        const status = ps?.latest_status || 'a-faire';
        return (
          <tr key={p.id} className="border-t border-fv-border/30 bg-fv-bg-secondary/20">
            <td className="py-1.5 pl-10 pr-3 text-xs text-fv-text-secondary">
              👤 {p.owner_name || p.title}
              {ps ? (
                <span className="ml-2 text-fv-text-secondary/60">
                  {ps.run_count} run{ps.run_count !== 1 ? 's' : ''}
                  {ps.bug_count > 0 ? ` · ${ps.bug_count} bug${ps.bug_count > 1 ? 's' : ''}` : ''}
                  {ps.evolution_count > 0 ? ` · ${ps.evolution_count} évol.` : ''}
                </span>
              ) : null}
            </td>
            {plans.map((pp) => (
              pp.id === p.id ? (
                <td key={pp.id} className="px-3 py-1.5 text-center">
                  {ps ? <StatusBadge status={status} /> : <span className="text-xs text-fv-text-secondary/40">—</span>}
                </td>
              ) : (
                <td key={pp.id} className="px-3 py-1.5" />
              )
            ))}
          </tr>
        );
      })}
    </>
  );
}

function StatusBadge({ status }) {
  const cls = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
  const label = STATUS_LABELS[status] || status;
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
