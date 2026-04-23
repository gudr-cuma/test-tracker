// Hex colors used by Recharts (Tailwind classes ne passent pas dans les SVG
// de recharts — il faut des valeurs directes). On reste alignés avec la palette
// FV + celle de STATUS_COLORS dans formatUtils.js.
export const STATUS_CHART_COLORS = {
  'a-faire': '#CBD5E0',   // gris neutre
  'en-cours': '#FF8200',  // fv-orange
  fait: '#31B700',        // fv-green
  bug: '#E53935',         // fv-red
  evolution: '#9333EA',   // violet
  'en-pause': '#B1DCE2',  // fv-blue
  clos: '#00965E',        // fv-forest
};

// Ordre métier (même que CasesTable) — utilisé pour empiler les barres
// dans FamilyBar et itérer proprement les statuts.
export const STATUS_ORDER = [
  'a-faire',
  'en-cours',
  'en-pause',
  'bug',
  'evolution',
  'fait',
  'clos',
];
