import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { STATUS_LABELS } from '../../engine/formatUtils.js';
import { STATUS_CHART_COLORS, STATUS_ORDER } from './statsColors.js';

/**
 * Barres empilées : une barre par famille, un segment par statut. `byFamily`
 * est au format { 'AUTH': { 'a-faire': 2, fait: 5, ... }, ... }. On pivote en
 * lignes pour recharts.
 */
export default function FamilyBar({ byFamily = {} }) {
  const data = useMemo(() => {
    const families = Object.keys(byFamily).sort();
    return families.map((fam) => {
      const counts = byFamily[fam] || {};
      const row = { family: fam };
      let total = 0;
      for (const s of STATUS_ORDER) {
        row[s] = counts[s] || 0;
        total += row[s];
      }
      row._total = total;
      return row;
    });
  }, [byFamily]);

  if (data.length === 0) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center text-sm text-fv-text-secondary">
        Aucune famille à afficher.
      </div>
    );
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="family"
            tick={{ fontSize: 12, fill: '#718096' }}
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#718096' }}
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid #E2E8F0',
            }}
            // On filtre les séries vides dans le tooltip pour éviter le bruit.
            itemSorter={(item) => -item.value}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
          />
          {STATUS_ORDER.map((s) => (
            <Bar
              key={s}
              dataKey={s}
              name={STATUS_LABELS[s] || s}
              stackId="status"
              fill={STATUS_CHART_COLORS[s]}
              // Arrondir le haut de la dernière barre de la pile.
              radius={s === 'clos' ? [4, 4, 0, 0] : 0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
