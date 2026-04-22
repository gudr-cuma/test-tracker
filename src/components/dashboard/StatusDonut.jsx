import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { STATUS_LABELS } from '../../engine/formatUtils.js';
import { STATUS_CHART_COLORS, STATUS_ORDER } from './statsColors.js';

/**
 * Donut du statut courant des cas. `byStatus` = { 'a-faire': 4, fait: 12, ... }.
 * Le "statut courant" d'un cas est celui de son dernier run (ou 'a-faire' s'il
 * n'y en a pas). Le calcul est fait côté API, on ne fait qu'afficher.
 */
export default function StatusDonut({ byStatus = {}, total = 0 }) {
  const data = STATUS_ORDER
    .map((key) => ({
      key,
      name: STATUS_LABELS[key] || key,
      value: byStatus[key] || 0,
    }))
    .filter((d) => d.value > 0);

  if (total === 0 || data.length === 0) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center text-sm text-fv-text-secondary">
        Aucun cas actif.
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
            stroke="#FFFFFF"
            strokeWidth={2}
          >
            {data.map((d) => (
              <Cell key={d.key} fill={STATUS_CHART_COLORS[d.key] || '#CBD5E0'} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const pct = total ? ((value / total) * 100).toFixed(0) : 0;
              return [`${value} (${pct}%)`, name];
            }}
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid #E2E8F0',
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
