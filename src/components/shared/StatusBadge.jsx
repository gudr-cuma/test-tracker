import { STATUS_LABELS, STATUS_COLORS } from '../../engine/formatUtils.js';

/**
 * Colored pill for a run status (or derived "current status" of a case).
 * When status is null/undefined, falls back to the 'a-faire' pill.
 */
export default function StatusBadge({ status, size = 'md', className = '' }) {
  const normalized = status || 'a-faire';
  const label = STATUS_LABELS[normalized] || normalized;
  const colors = STATUS_COLORS[normalized] || STATUS_COLORS['a-faire'];
  const sizeCls =
    size === 'sm' ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${colors} ${sizeCls} ${className}`}
    >
      {label}
    </span>
  );
}
