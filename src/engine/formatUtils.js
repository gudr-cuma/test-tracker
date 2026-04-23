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

export const STATUS_COLORS = {
  'a-faire': 'bg-gray-100 text-gray-700',
  'en-cours': 'bg-fv-orange-light text-fv-orange-dark',
  fait: 'bg-fv-green-light text-fv-green-dark',
  bug: 'bg-red-100 text-fv-red',
  evolution: 'bg-purple-100 text-purple-700',
  'en-pause': 'bg-fv-blue-light text-fv-text',
  clos: 'bg-fv-green-light text-fv-forest',
};
