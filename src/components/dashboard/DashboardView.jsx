import { useCallback, useEffect, useMemo, useState } from 'react';
import { statsApi } from '../../api/resources.js';
import { STATUS_LABELS, formatDuration } from '../../engine/formatUtils.js';
import ErrorBanner from '../shared/ErrorBanner.jsx';
import Spinner from '../shared/Spinner.jsx';
import CumulativeLine from './CumulativeLine.jsx';
import DashboardCard from './DashboardCard.jsx';
import FamilyBar from './FamilyBar.jsx';
import InstabilityTop from './InstabilityTop.jsx';
import { STATUS_CHART_COLORS, STATUS_ORDER } from './statsColors.js';
import StatusDonut from './StatusDonut.jsx';

export default function DashboardView({ planId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await statsApi.get(planId);
      setStats(res);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => { reload(); }, [reload]);

  const kpis = useMemo(() => {
    if (!stats) return null;
    const total = stats.totals?.cases || 0;
    const by = stats.totals?.byStatus || {};
    const done = (by.fait || 0) + (by.clos || 0);
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, pct, byStatus: by };
  }, [stats]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size={28} />
      </div>
    );
  }

  if (error && !stats) return <ErrorBanner message={error} onRetry={reload} />;
  if (!stats) return null;

  return (
    <div className="flex flex-col gap-4">
      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

      {/* Ligne principale : [KPIs + Donut] à gauche | [Famille] à droite */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Colonne gauche : KPIs 2×3 + Donut en dessous */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <Kpi label="Cas actifs"             value={kpis.total} />
            <Kpi label="Terminés (fait + clos)" value={kpis.done}                    accent="green" />
            <Kpi label="Avancement"             value={`${kpis.pct}%`}               accent="orange" />
            <Kpi label="En bug"                 value={kpis.byStatus.bug || 0}       accent="red" />
            <Kpi label="Évolution"              value={kpis.byStatus.evolution || 0} accent="purple" />
            <Kpi label="Temps cumulé"           value={formatDuration(stats.totals?.total_time_ms || 0)} />
          </div>

          <DashboardCard title="Statut courant des cas" subtitle={`${kpis.total} cas actifs`}>
            <StatusDonut byStatus={kpis.byStatus} total={kpis.total} />
          </DashboardCard>
        </div>

        {/* Colonne droite : Répartition par famille */}
        <DashboardCard title="Répartition par famille" subtitle="Empilé par statut · temps à droite">
          <FamilyBar byFamily={stats.byFamily || {}} byFamilyTime={stats.byFamilyTime || {}} />
        </DashboardCard>
      </div>

      <DashboardCard
        title="Top 10 instabilité"
        subtitle="Cas avec le plus de runs en statut bug"
      >
        <InstabilityTop instability={stats.instability || []} />
      </DashboardCard>

      {/* Légende couleurs statut */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-fv-text-secondary">
        <span className="font-medium">Légende :</span>
        {STATUS_ORDER.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: STATUS_CHART_COLORS[s] }}
            />
            {STATUS_LABELS[s]}
          </span>
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }) {
  const accentCls =
    accent === 'green'  ? 'text-fv-green-dark' :
    accent === 'orange' ? 'text-fv-orange' :
    accent === 'red'    ? 'text-fv-red' :
    accent === 'purple' ? 'text-purple-600' :
    'text-fv-text';
  return (
    <div className="rounded-md border border-fv-border bg-white px-3 py-2.5">
      <div className="text-xs font-semibold uppercase tracking-wide text-fv-text-secondary">
        {label}
      </div>
      <div className={`mt-0.5 text-xl font-semibold tabular-nums ${accentCls}`}>
        {value}
      </div>
    </div>
  );
}
