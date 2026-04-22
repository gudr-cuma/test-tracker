import StatusBadge from '../shared/StatusBadge.jsx';

/**
 * Pure display component. Parent passes the already-filtered list
 * and the `onSelect` callback for row clicks.
 */
export default function CasesTable({ cases, selectedId, onSelect }) {
  return (
    <div className="overflow-x-auto rounded-md border border-fv-border bg-white">
      <table className="min-w-full divide-y divide-fv-border text-sm">
        <thead className="bg-fv-bg-secondary text-xs uppercase tracking-wide text-fv-text-secondary">
          <tr>
            <Th>ID</Th>
            <Th>Titre</Th>
            <Th>Famille</Th>
            <Th align="right">Statut</Th>
            <Th align="right">Runs</Th>
            <Th align="right">Bugs</Th>
            <Th align="right">Priorité</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-fv-border">
          {cases.map((c) => {
            const active = c.id === selectedId;
            return (
              <tr
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={[
                  'cursor-pointer transition',
                  active
                    ? 'bg-fv-blue-light'
                    : 'hover:bg-fv-bg-secondary',
                  c.removed_from_md ? 'text-fv-text-secondary' : '',
                ].join(' ')}
              >
                <Td className="font-mono text-xs">
                  <div className="flex items-center gap-1.5">
                    <span>{c.id}</span>
                    {c.source === 'manual' ? (
                      <span
                        title="Cas manuel"
                        className="rounded bg-fv-orange-light px-1 py-0.5 text-[10px] font-semibold text-fv-orange-dark"
                      >
                        M
                      </span>
                    ) : null}
                    {c.removed_from_md ? (
                      <span
                        title="Retiré du markdown"
                        className="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-semibold text-fv-text-secondary"
                      >
                        ✕
                      </span>
                    ) : null}
                  </div>
                </Td>
                <Td className="max-w-md">
                  <div className="line-clamp-2 font-medium text-fv-text">
                    {c.title}
                  </div>
                </Td>
                <Td>{c.family || '—'}</Td>
                <Td align="right">
                  <StatusBadge status={c.latest_status} size="sm" />
                </Td>
                <Td align="right" className="tabular-nums">
                  {c.run_count || 0}
                </Td>
                <Td
                  align="right"
                  className={`tabular-nums ${c.bug_count ? 'font-semibold text-fv-red' : ''}`}
                >
                  {c.bug_count || 0}
                </Td>
                <Td align="right" className="tabular-nums">
                  {c.priority || '—'}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, align = 'left' }) {
  const a = align === 'right' ? 'text-right' : 'text-left';
  return (
    <th scope="col" className={`${a} px-3 py-2 font-semibold`}>
      {children}
    </th>
  );
}

function Td({ children, align = 'left', className = '' }) {
  const a = align === 'right' ? 'text-right' : 'text-left';
  return <td className={`${a} px-3 py-2 ${className}`}>{children}</td>;
}
