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

export function exportCasesToXlsx(planTitle, cases) {
  const headers = COLUMNS.map((c) => c.header);
  const rows = cases.map((c) => COLUMNS.map((col) => c[col.key] ?? ''));

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Column widths
  ws['!cols'] = [
    { wch: 16 },  // ID
    { wch: 14 },  // Famille
    { wch: 36 },  // Titre
    { wch: 30 },  // Préconditions
    { wch: 40 },  // Étapes
    { wch: 30 },  // Résultat attendu
    { wch: 10 },  // Priorité
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cas de test');

  const safeTitle = planTitle.replace(/[/\\?%*:|"<>]/g, '-');
  XLSX.writeFile(wb, `${safeTitle}.xlsx`);
}
