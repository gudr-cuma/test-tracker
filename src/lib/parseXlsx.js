import * as XLSX from 'xlsx';

const ID_RE = /^TC-[A-Z]+-\d+$/;
const FAMILY_RE = /^TC-([A-Z]+)-/;

export function parseXlsx(buffer, filenameWithoutExt) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('Fichier Excel vide (aucun onglet).');

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (rows.length < 2) throw new Error('Aucune ligne de données trouvée dans le fichier.');

  const cases = [];
  const seen = new Set();

  for (let i = 1; i < rows.length; i++) {
    const [rawId, rawFamily, rawTitle, rawPre, rawSteps, rawExpected, rawPriority] =
      rows[i].map((cell) => String(cell ?? '').trim());

    if (!rawId) continue;

    if (!ID_RE.test(rawId)) {
      throw new Error(`Ligne ${i + 1} : identifiant invalide "${rawId}" (format attendu : TC-FAMILLE-000)`);
    }
    if (seen.has(rawId)) {
      throw new Error(`Ligne ${i + 1} : identifiant en doublon "${rawId}"`);
    }
    seen.add(rawId);

    const familyFromId = FAMILY_RE.exec(rawId)?.[1] ?? '';

    cases.push({
      id: rawId,
      family: rawFamily || familyFromId,
      title: rawTitle,
      preconditions: rawPre,
      steps: rawSteps,
      expected: rawExpected,
      priority: rawPriority,
    });
  }

  if (cases.length === 0) throw new Error('Aucun cas de test valide trouvé dans le fichier.');

  return { title: filenameWithoutExt, cases };
}
