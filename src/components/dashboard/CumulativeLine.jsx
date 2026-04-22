import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDate } from '../../engine/formatUtils.js';

/**
 * Courbe cumulative des cas terminés (fait + clos). `cumulative` est une
 * série `[{date: 'YYYY-MM-DD', cumulative, delta}]` renvoyée par /api/stats.
 * Une ligne horizontale à `totalActiveCases` donne la cible d'exécution.
 */
export default function CumulativeLine({ cumulative = [], totalActiveCases = 0 }) {
  if (cumulative.length === 0) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center text-sm text-fv-text-secondary">
        Aucun cas terminé pour l&rsquo;instant.
      </div>
    );
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer>
        <LineChart data={cumulative} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => formatDate(d)}
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
            labelFormatter={(d) => formatDate(d)}
            formatter={(value, name) => {
              if (name === 'cumulative') return [value, 'Cumulé'];
              if (name === 'delta') return [value, 'Ce jour'];
              return [value, name];
            }}
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid #E2E8F0',
            }}
          />
          {totalActiveCases > 0 ? (
            <ReferenceLine
              y={totalActiveCases}
              stroke="#718096"
              strokeDasharray="4 4"
              label={{
                value: `Total cas : ${totalActiveCases}`,
                fill: '#718096',
                fontSize: 11,
                position: 'insideTopRight',
              }}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="cumulative"
            stroke="#00965E"
            strokeWidth={2}
            dot={{ r: 3, fill: '#00965E' }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
