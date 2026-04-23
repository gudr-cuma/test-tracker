import * as XLSX from 'xlsx';

const ID_RE = /^TC-[A-Z0-9]+-\d+$/;
const FAMILY_RE = /^TC-([A-Z0-9]+)-/;
const CHECK_RE = /^CHECK_(\d+)$/i;

function normalizeHeader(h) {
  return String(h ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function detectColumn(header) {
  const h = normalizeHeader(header);
  if (!h) return null;
  if (/^id\b/.test(h) || h === 'identifiant' || h.startsWith('identifiant')) return 'id';
  if (/^famille/.test(h)) return 'family';
  if (/^titre/.test(h) || h === 'nom' || /^intitul/.test(h)) return 'title';
  if (/^pr[eé]condition/.test(h)) return 'preconditions';
  if (/^[eé]tape/.test(h)) return 'steps';
  if (/^r[eé]sultat/.test(h) || /attendu/.test(h)) return 'expected';
  if (/^priorit[eé]/.test(h)) return 'priority';
  return null;
}

export function parseXlsx(buffer, filenameWithoutExt) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('Fichier Excel vide (aucun onglet).');

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (rows.length < 2) throw new Error('Aucune ligne de données trouvée dans le fichier.');

  const headerRow = rows[0].map((h) => String(h ?? ''));

  // Map field name → column index, by fuzzy header matching.
  const colMap = {};
  const checkColumns = [];
  for (let col = 0; col < headerRow.length; col++) {
    const raw = headerRow[col];
    const checkMatch = CHECK_RE.exec(String(raw).trim());
    if (checkMatch) {
      checkColumns.push({ col, n: Number(checkMatch[1]) });
      continue;
    }
    const field = detectColumn(raw);
    if (field && colMap[field] === undefined) colMap[field] = col;
  }
  checkColumns.sort((a, b) => a.n - b.n);

  if (colMap.id === undefined) {
    throw new Error('Colonne identifiant introuvable dans l\'en-tête (attendu : "ID" ou "ID Test").');
  }
  if (colMap.title === undefined) {
    throw new Error('Colonne titre introuvable dans l\'en-tête (attendu : "Titre" ou "Titre du test").');
  }

  const cellAt = (row, field) => {
    const col = colMap[field];
    if (col === undefined) return '';
    return String(row[col] ?? '').trim();
  };

  const cases = [];
  const seen = new Set();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rawId = cellAt(row, 'id');
    if (!rawId) continue;

    if (!ID_RE.test(rawId)) {
      throw new Error(`Ligne ${i + 1} : identifiant invalide "${rawId}" (format attendu : TC-FAMILLE-000)`);
    }
    if (seen.has(rawId)) {
      throw new Error(`Ligne ${i + 1} : identifiant en doublon "${rawId}"`);
    }
    seen.add(rawId);

    const familyFromId = FAMILY_RE.exec(rawId)?.[1] ?? '';

    const checklist = [];
    for (const { col } of checkColumns) {
      const label = String(row[col] ?? '').trim();
      if (label) checklist.push({ position: checklist.length, label });
    }

    cases.push({
      id: rawId,
      family: cellAt(row, 'family') || familyFromId,
      title: cellAt(row, 'title'),
      preconditions: cellAt(row, 'preconditions'),
      steps: cellAt(row, 'steps'),
      expected: cellAt(row, 'expected'),
      priority: cellAt(row, 'priority'),
      checklist,
    });
  }

  if (cases.length === 0) throw new Error('Aucun cas de test valide trouvé dans le fichier.');

  return { title: filenameWithoutExt, cases };
}
