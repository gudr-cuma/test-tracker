import { useCallback, useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { projectsApi } from '../../api/resources.js';
import { STATUS_LABELS } from '../../engine/formatUtils.js';
import { STATUS_CHART_COLORS, STATUS_ORDER } from '../dashboard/statsColors.js';
import ErrorBanner from '../shared/ErrorBanner.jsx';
import Spinner from '../shared/Spinner.jsx';

export default function ProjectDashboard({ projectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await projectsApi.getStats(projectId);
      setData(res);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size={28} />
      </div>
    );
  }

  if (error) return <ErrorBanner message={error} onRetry={load} />;

  const { byUser = [], totals = {} } = data || {};
  const avgPct = byUser.length > 0
    ? Math.round(byUser.reduce((s, u) => s + u.pct, 0) / byUser.length)
    : 0;

  // Préparer les données pour le bar chart horizontal
  // Une ligne par plan/utilisateur, segments colorés par statut
  const chartData = byUser.map((u) => {
    const todo = u.cases - u.done - u.bug - u.evolution - u.in_progress;
    return {
      name: u.owner_name || u.plan_title,
      'À faire': Math.max(0, todo),
      'En cours': u.in_progress,
      'Bug': u.bug,
      'Évolution': u.evolution,
      'Fait/Clos': u.done,
    };
  });

  const barHeight = Math.max(240, byUser.length * 52 + 60);

  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiTile label="Total cas" value={totals.cases ?? 0} />
        <KpiTile label="Terminés" value={totals.done ?? 0} />
        <KpiTile label="Avancement moyen" value={`${avgPct}%`} highlight />
        <KpiTile label="En bug" value={totals.bug ?? 0} danger />
      </div>

      {byUser.length === 0 ? (
        <div className="rounded-md border border-dashed border-fv-border bg-white p-8 text-center text-sm text-fv-text-secondary">
          Ce projet n&rsquo;a aucun plan de test ou aucun cas.
        </div>
      ) : (
        <>
          {/* Tableau récapitulatif */}
          <div className="overflow-x-auto rounded-lg border border-fv-border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-fv-border bg-fv-bg-secondary text-xs font-semibold uppercase tracking-wide text-fv-text-secondary">
                  <th className="px-4 py-2 text-left">Utilisateur / Plan</th>
                  <th className="px-4 py-2 text-right">Cas</th>
                  <th className="px-4 py-2 text-right">Terminés</th>
                  <th className="px-4 py-2 text-right">Bugs</th>
                  <th className="px-4 py-2 text-right">Évolutions</th>
                  <th className="px-4 py-2 text-right">Avancement</th>
                </tr>
              </thead>
              <tbody>
                {byUser.map((u) => (
                  <tr key={u.plan_id} className="border-t border-fv-border/40 hover:bg-fv-bg-secondary/30">
                    <td className="px-4 py-2">
                      <div className="font-medium text-fv-text">{u.owner_name || '—'}</div>
                      <div className="text-xs text-fv-text-secondary">{u.plan_title}</div>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{u.cases}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-fv-green-dark">{u.done}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-fv-red">{u.bug}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-purple-600">{u.evolution}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-gray-100">
                          <div
                            className="h-1.5 rounded-full bg-fv-green"
                            style={{ width: `${u.pct}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-xs font-medium text-fv-text">{u.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bar chart horizontal */}
          <div className="rounded-lg border border-fv-border bg-white p-4">
            <h3 className="mb-4 text-sm font-semibold text-fv-text-secondary uppercase tracking-wide">
              Répartition par statut
            </h3>
            <div style={{ height: barHeight }}>
              <ResponsiveContainer>
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
                  barSize={22}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 12, fill: '#718096' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#718096' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                  />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #E2E8F0' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="À faire"   stackId="s" fill={STATUS_CHART_COLORS['a-faire']} />
                  <Bar dataKey="En cours"  stackId="s" fill={STATUS_CHART_COLORS['en-cours']} />
                  <Bar dataKey="Bug"       stackId="s" fill={STATUS_CHART_COLORS['bug']} />
                  <Bar dataKey="Évolution" stackId="s" fill={STATUS_CHART_COLORS['evolution']} />
                  <Bar dataKey="Fait/Clos" stackId="s" fill={STATUS_CHART_COLORS['fait']} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiTile({ label, value, highlight, danger }) {
  return (
    <div className="rounded-lg border border-fv-border bg-white px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-fv-text-secondary">{label}</dt>
      <dd className={`mt-1 text-2xl font-bold ${danger ? 'text-fv-red' : highlight ? 'text-fv-orange' : 'text-fv-text'}`}>
        {value}
      </dd>
    </div>
  );
}
