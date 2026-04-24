import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { STATUS_LABELS, formatDuration } from '../../engine/formatUtils.js';
import { STATUS_CHART_COLORS, STATUS_ORDER } from './statsColors.js';

/**
 * Barres empilées horizontales : une ligne par famille, un segment par statut.
 * `byFamily`     : { 'AUTH': { 'a-faire': 2, fait: 5, … }, … }
 * `byFamilyTime` : { 'AUTH': 5400000, … }  (ms)
 */
export default function FamilyBar({ byFamily = {}, byFamilyTime = {} }) {
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
      const ms = byFamilyTime[fam] || 0;
      row.time_label = ms > 0 ? formatDuration(ms) : '';
      return row;
    });
  }, [byFamily, byFamilyTime]);

  if (data.length === 0) {
    return (
      <div className="flex h-full min-h-[120px] items-center justify-center text-sm text-fv-text-secondary">
        Aucune famille à afficher.
      </div>
    );
  }

  // Barres plus fines + espacement réduit : 16 px par barre, 28 px par ligne
  const barSize = 14;
  const rowHeight = 28;
  const height = Math.max(160, data.length * rowHeight + 48);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 2, right: 56, bottom: 2, left: 0 }}
          barSize={barSize}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />

          {/* Axe familles (gauche) */}
          <YAxis
            yAxisId="left"
            type="category"
            dataKey="family"
            width={72}
            tick={{ fontSize: 11, fill: '#718096', fontFamily: 'monospace', fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
          />

          {/* Axe temps par famille (droite) — ticks affichent le temps cumulé */}
          <YAxis
            yAxisId="right"
            orientation="right"
            type="category"
            dataKey="time_label"
            width={44}
            tick={{ fontSize: 10, fill: '#A0AEC0' }}
            tickLine={false}
            axisLine={false}
          />

          {/* Axe valeurs (bas) */}
          <XAxis
            yAxisId="left"
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 10, fill: '#718096' }}
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
          />

          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #E2E8F0' }}
            itemSorter={(item) => -item.value}
            formatter={(value, name) => [value, STATUS_LABELS[name] || name]}
          />

          {STATUS_ORDER.map((s, i) => (
            <Bar
              key={s}
              yAxisId="left"
              dataKey={s}
              name={STATUS_LABELS[s] || s}
              stackId="status"
              fill={STATUS_CHART_COLORS[s]}
              radius={i === STATUS_ORDER.length - 1 ? [0, 3, 3, 0] : 0}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
