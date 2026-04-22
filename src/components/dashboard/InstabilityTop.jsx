/**
 * Petit tableau des 10 cas les plus instables (le plus de runs en statut
 * `bug`). Aide à repérer les zones du produit qui régressent.
 */
export default function InstabilityTop({ instability = [] }) {
  if (instability.length === 0) {
    return (
      <div className="flex min-h-[100px] items-center justify-center text-sm text-fv-text-secondary">
        Aucun run en bug — tout va bien.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-fv-border text-sm">
        <thead className="bg-fv-bg-secondary text-xs uppercase tracking-wide text-fv-text-secondary">
          <tr>
            <Th align="right">#</Th>
            <Th>ID</Th>
            <Th>Famille</Th>
            <Th>Titre</Th>
            <Th align="right">Runs en bug</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-fv-border">
          {instability.map((row, i) => (
            <tr key={row.case_id} className="hover:bg-fv-bg-secondary">
              <Td align="right" className="tabular-nums text-fv-text-secondary">
                {i + 1}
              </Td>
              <Td className="font-mono text-xs">{row.case_id}</Td>
              <Td>{row.family || '—'}</Td>
              <Td>
                <span className="line-clamp-1">{row.title}</span>
              </Td>
              <Td align="right" className="tabular-nums font-semibold text-fv-red">
                {row.bug_count}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, align = 'left' }) {
  const a = align === 'right' ? 'text-right' : 'text-left';
  return <th scope="col" className={`${a} px-3 py-2 font-semibold`}>{children}</th>;
}

function Td({ children, align = 'left', className = '' }) {
  const a = align === 'right' ? 'text-right' : 'text-left';
  return <td className={`${a} px-3 py-2 ${className}`}>{children}</td>;
}
