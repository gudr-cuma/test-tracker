import { STATUS_LABELS } from '../../engine/formatUtils.js';

const STATUS_OPTIONS = Object.entries(STATUS_LABELS);

/**
 * Minimal native <select> styled like a status pill. The value change
 * bubbles up via onChange. Disabled state shows a grey pill instead.
 */
export default function StatusSelect({ value, onChange, disabled = false, size = 'md' }) {
  const sizeCls =
    size === 'sm' ? 'text-[11px] pl-2 pr-6 py-0.5' : 'text-xs pl-2.5 pr-7 py-1';
  return (
    <select
      value={value || 'a-faire'}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`cursor-pointer rounded-full border border-fv-border bg-white font-medium text-fv-text appearance-auto focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange disabled:cursor-not-allowed disabled:opacity-60 ${sizeCls}`}
    >
      {STATUS_OPTIONS.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}
