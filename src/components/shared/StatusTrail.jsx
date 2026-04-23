import { STATUS_LABELS, formatDateTime } from '../../engine/formatUtils.js';
import StatusBadge from './StatusBadge.jsx';

const STATUS_COLORS_HEX = {
  'a-faire':  '#D1D5DB',
  'en-cours': '#FF8200',
  fait:       '#31B700',
  bug:        '#E53935',
  evolution:  '#9333EA',
  'en-pause': '#B1DCE2',
  clos:       '#00965E',
};

export default function StatusTrail({ runs = [], fallbackStatus }) {
  // API returns newest-first → reverse for left-to-right chronological display
  const ordered = [...runs].reverse();

  if (ordered.length === 0) {
    return <StatusBadge status={fallbackStatus} size="sm" />;
  }

  const last = ordered[ordered.length - 1];
  const previous = ordered.slice(0, -1);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {previous.map((run) => {
        const color = STATUS_COLORS_HEX[run.status] ?? '#D1D5DB';
        const label = STATUS_LABELS[run.status] ?? run.status;
        const date = formatDateTime(run.updated_at || run.created_at);
        return (
          <span key={run.id} className="flex items-center gap-1">
            <span
              title={`${label} — ${date}`}
              className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-fv-text-secondary" aria-hidden="true">›</span>
          </span>
        );
      })}
      <StatusBadge status={last.status} size="sm" />
    </div>
  );
}
