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
 * Barres empilées horizontales : une ligne par famille, un segment par statut.
 * `byFamily` est au format { 'AUTH': { 'a-faire': 2, fait: 5, … }, … }.
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

  // Hauteur dynamique : 44 px par famille + marges
  const height = Math.max(240, data.length * 44 + 64);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
          barSize={22}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />

          {/* Axe catégories (familles) à gauche */}
          <YAxis
            type="category"
            dataKey="family"
            width={72}
            tick={{ fontSize: 12, fill: '#718096', fontFamily: 'monospace', fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
          />

          {/* Axe valeurs en bas */}
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#718096' }}
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
          />

          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #E2E8F0' }}
            itemSorter={(item) => -item.value}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />

          {STATUS_ORDER.map((s) => (
            <Bar
              key={s}
              dataKey={s}
              name={STATUS_LABELS[s] || s}
              stackId="status"
              fill={STATUS_CHART_COLORS[s]}
              // Arrondir l'extrémité droite de la dernière barre de la pile
              radius={s === 'clos' ? [0, 4, 4, 0] : 0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
