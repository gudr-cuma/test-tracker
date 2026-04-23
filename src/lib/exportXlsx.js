import * as XLSX from 'xlsx';

const COLUMNS = [
  { key: 'id',            header: 'ID' },
  { key: 'family',        header: 'Famille' },
  { key: 'title',         header: 'Titre' },
  { key: 'preconditions', header: 'Préconditions' },
  { key: 'steps',         header: 'Étapes' },
  { key: 'expected',      header: 'Résultat attendu' },
  { key: 'priority',      header: 'Priorité' },
];

function checkHeader(n) {
  return `CHECK_${String(n + 1).padStart(3, '0')}`;
}

export function exportCasesToXlsx(planTitle, cases) {
  const maxItems = cases.reduce(
    (max, c) => Math.max(max, Array.isArray(c.checklist) ? c.checklist.length : 0),
    0,
  );

  const headers = [
    ...COLUMNS.map((c) => c.header),
    ...Array.from({ length: maxItems }, (_, i) => checkHeader(i)),
  ];

  const rows = cases.map((c) => {
    const base = COLUMNS.map((col) => c[col.key] ?? '');
    const items = Array.isArray(c.checklist) ? c.checklist : [];
    const checks = Array.from({ length: maxItems }, (_, i) => items[i]?.label ?? '');
    return [...base, ...checks];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  ws['!cols'] = [
    { wch: 16 },  // ID
    { wch: 14 },  // Famille
    { wch: 36 },  // Titre
    { wch: 30 },  // Préconditions
    { wch: 40 },  // Étapes
    { wch: 30 },  // Résultat attendu
    { wch: 10 },  // Priorité
    ...Array.from({ length: maxItems }, () => ({ wch: 28 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cas de test');

  const safeTitle = planTitle.replace(/[/\\?%*:|"<>]/g, '-');
  XLSX.writeFile(wb, `${safeTitle}.xlsx`);
}
