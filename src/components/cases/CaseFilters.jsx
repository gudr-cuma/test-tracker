import { useMemo } from 'react';
import { STATUS_LABELS } from '../../engine/formatUtils.js';

const STATUS_OPTIONS = [
  ['', 'Tous statuts'],
  ...Object.entries(STATUS_LABELS),
];

/**
 * Controlled filter bar for the cases table. Keeps its own markup simple;
 * filtering logic is applied by the parent.
 */
export default function CaseFilters({
  cases,
  query, onQueryChange,
  family, onFamilyChange,
  status, onStatusChange,
  sourceFilter, onSourceFilterChange,
  bugFilter, onBugFilterChange,
}) {
  const families = useMemo(() => {
    const set = new Set();
    for (const c of cases) if (c.family) set.add(c.family);
    return [...set].sort();
  }, [cases]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        placeholder="Rechercher par ID ou titre…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="min-w-[220px] flex-1 rounded-md border border-fv-border bg-white px-3 py-1.5 text-sm text-fv-text placeholder:text-fv-text-secondary focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange"
      />

      <select
        value={family}
        onChange={(e) => onFamilyChange(e.target.value)}
        className="rounded-md border border-fv-border bg-white px-2.5 py-1.5 text-sm text-fv-text focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange"
      >
        <option value="">Toutes familles</option>
        {families.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="rounded-md border border-fv-border bg-white px-2.5 py-1.5 text-sm text-fv-text focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange"
      >
        {STATUS_OPTIONS.map(([value, label]) => (
          <option key={value || 'all'} value={value}>{label}</option>
        ))}
      </select>

      <select
        value={bugFilter}
        onChange={(e) => onBugFilterChange(e.target.value)}
        className="rounded-md border border-fv-border bg-white px-2.5 py-1.5 text-sm text-fv-text focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange"
        aria-label="Filtre bugs"
      >
        <option value="">Avec ou sans bug</option>
        <option value="with">Avec bug(s)</option>
        <option value="without">Sans bug</option>
      </select>

      <select
        value={sourceFilter}
        onChange={(e) => onSourceFilterChange(e.target.value)}
        className="rounded-md border border-fv-border bg-white px-2.5 py-1.5 text-sm text-fv-text focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange"
        aria-label="Filtre d'origine"
      >
        <option value="active">Actifs (MD + manuels)</option>
        <option value="markdown">Issus du markdown</option>
        <option value="manual">Manuels uniquement</option>
        <option value="removed">Retirés du MD</option>
        <option value="all">Tout afficher</option>
      </select>
    </div>
  );
}
