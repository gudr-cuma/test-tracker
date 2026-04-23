const COLORS = {
  reached: '#31B700',
  current: '#FF8200',
  bug:     '#E53935',
  idle:    '#D1D5DB',
};

/**
 * Fil d'Ariane d'une checklist pour un run donné.
 * Props:
 *   - items: [{ id, position, label }]
 *   - currentItemId: string | null  (run.checklist_item_id)
 *   - runStatus: string             (run.status)
 */
export default function ChecklistTrail({ items = [], currentItemId, runStatus }) {
  if (!items.length) return null;

  const current = currentItemId ? items.find((i) => i.id === currentItemId) : null;
  const currentPos = current ? current.position : null;

  function dotColor(item) {
    if (runStatus === 'fait' || runStatus === 'clos') return COLORS.reached;
    if (currentPos == null) return COLORS.idle;
    if (item.position < currentPos) return COLORS.reached;
    if (item.position === currentPos) {
      return runStatus === 'bug' ? COLORS.bug : COLORS.current;
    }
    return COLORS.idle;
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {items.map((item, idx) => (
        <span key={item.id} className="flex items-center gap-1">
          <span
            title={`${item.position + 1}. ${item.label}`}
            className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: dotColor(item) }}
          />
          {idx < items.length - 1 ? (
            <span className="text-xs text-fv-text-secondary" aria-hidden="true">›</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}
