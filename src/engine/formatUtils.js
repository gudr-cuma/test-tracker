const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const DATETIME_FMT = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : DATE_FMT.format(d);
}

export function formatDateTime(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : DATETIME_FMT.format(d);
}

export const STATUS_LABELS = {
  'a-faire': 'À faire',
  'en-cours': 'En cours',
  fait: 'Fait',
  bug: 'Bug',
  evolution: 'Évolution',
  'en-pause': 'En pause',
  clos: 'Clos',
};

/**
 * Formate une durée en ms vers une chaîne lisible.
 *  - < 1 h : "mm:ss"
 *  - >= 1 h : "Nh Mm"
 */
export function formatDuration(ms) {
  const n = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = n % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const STATUS_COLORS = {
  'a-faire': 'bg-gray-100 text-gray-700',
  'en-cours': 'bg-fv-orange-light text-fv-orange-dark',
  fait: 'bg-fv-green-light text-fv-green-dark',
  bug: 'bg-red-100 text-fv-red',
  evolution: 'bg-purple-100 text-purple-700',
  'en-pause': 'bg-fv-blue-light text-fv-text',
  clos: 'bg-fv-green-light text-fv-forest',
};
