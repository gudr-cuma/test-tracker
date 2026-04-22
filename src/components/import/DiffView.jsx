import { useMemo } from 'react';

/**
 * Present the diff returned by /api/plans/import/dry-run and let the user
 * pick which changes to apply. Controlled component — parent owns the
 * selection state (three Sets of case IDs) and receives toggle callbacks.
 *
 * Props:
 *  - mode: 'new-plan' | 'update-plan'
 *  - diff: { added, changed, removed }
 *  - acceptedAdded / acceptedChanged / acceptedRemoved : Set<string>
 *  - onToggle(section, id) / onToggleAll(section, checked)
 */
export default function DiffView({
  mode,
  diff,
  acceptedAdded,
  acceptedChanged,
  acceptedRemoved,
  onToggle,
  onToggleAll,
}) {
  const totals = useMemo(
    () => ({
      added: diff.added.length,
      changed: diff.changed.length,
      removed: diff.removed.length,
    }),
    [diff],
  );

  if (mode === 'new-plan') {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-fv-blue-light p-3 text-sm text-fv-text">
          Nouveau cahier — <strong>{totals.added}</strong>{' '}
          {totals.added <= 1 ? 'cas sera créé' : 'cas seront créés'}.
        </div>
        <Section
          title={`Cas à ajouter (${totals.added})`}
          kind="added"
          items={diff.added}
          accepted={acceptedAdded}
          onToggle={onToggle}
          onToggleAll={onToggleAll}
          renderItem={(c) => <AddedRow c={c} />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-fv-blue-light p-3 text-sm text-fv-text">
        <strong>{totals.added}</strong> ajout{totals.added > 1 ? 's' : ''},{' '}
        <strong>{totals.changed}</strong> modif{totals.changed > 1 ? 's' : ''},{' '}
        <strong>{totals.removed}</strong> retrait{totals.removed > 1 ? 's' : ''}
        . Les runs et commentaires existants sont conservés.
      </div>

      {totals.added > 0 ? (
        <Section
          title={`Ajoutés (${totals.added})`}
          kind="added"
          items={diff.added}
          accepted={acceptedAdded}
          onToggle={onToggle}
          onToggleAll={onToggleAll}
          renderItem={(c) => <AddedRow c={c} />}
        />
      ) : null}

      {totals.changed > 0 ? (
        <Section
          title={`Modifiés (${totals.changed})`}
          kind="changed"
          items={diff.changed}
          accepted={acceptedChanged}
          onToggle={onToggle}
          onToggleAll={onToggleAll}
          renderItem={(ch) => <ChangedRow ch={ch} />}
        />
      ) : null}

      {totals.removed > 0 ? (
        <Section
          title={`Supprimés du markdown (${totals.removed})`}
          kind="removed"
          items={diff.removed}
          accepted={acceptedRemoved}
          onToggle={onToggle}
          onToggleAll={onToggleAll}
          renderItem={(c) => <RemovedRow c={c} />}
        />
      ) : null}

      {totals.added === 0 && totals.changed === 0 && totals.removed === 0 ? (
        <div className="rounded-md border border-fv-border bg-white p-4 text-sm text-fv-text-secondary">
          Aucun changement détecté — le cahier en DB est identique au markdown
          importé.
        </div>
      ) : null}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────

function Section({
  title,
  kind,
  items,
  accepted,
  onToggle,
  onToggleAll,
  renderItem,
}) {
  const allChecked = items.length > 0 && items.every((it) => accepted.has(it.id));
  const someChecked = items.some((it) => accepted.has(it.id));

  return (
    <section className="rounded-md border border-fv-border bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-fv-border px-4 py-2">
        <h3 className="text-sm font-semibold text-fv-text">{title}</h3>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-fv-text-secondary">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-fv-border text-fv-orange focus:ring-fv-orange"
            checked={allChecked}
            ref={(el) => {
              if (el) el.indeterminate = !allChecked && someChecked;
            }}
            onChange={(e) => onToggleAll(kind, e.target.checked)}
          />
          Tout cocher
        </label>
      </header>
      <ul className="divide-y divide-fv-border">
        {items.map((it) => (
          <li
            key={it.id}
            className="flex items-start gap-3 px-4 py-2.5 hover:bg-fv-bg-secondary"
          >
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-fv-border text-fv-orange focus:ring-fv-orange"
              checked={accepted.has(it.id)}
              onChange={() => onToggle(kind, it.id)}
              aria-label={`Inclure ${it.id}`}
            />
            <div className="min-w-0 flex-1">{renderItem(it)}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CaseId({ children }) {
  return (
    <code className="rounded bg-fv-bg-secondary px-1.5 py-0.5 font-mono text-xs text-fv-text">
      {children}
    </code>
  );
}

function AddedRow({ c }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <CaseId>{c.id}</CaseId>
        <span className="text-sm font-medium text-fv-text">{c.title}</span>
      </div>
      {c.family ? (
        <div className="mt-0.5 text-xs text-fv-text-secondary">Famille {c.family}</div>
      ) : null}
    </div>
  );
}

function RemovedRow({ c }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <CaseId>{c.id}</CaseId>
        <span className="text-sm text-fv-text">{c.title}</span>
      </div>
      <div className="mt-0.5 text-xs text-fv-text-secondary">
        Sera marqué <em>removed_from_md</em> — l&rsquo;historique des runs et
        commentaires est conservé.
      </div>
    </div>
  );
}

function ChangedRow({ ch }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <CaseId>{ch.id}</CaseId>
        <span className="text-sm font-medium text-fv-text">
          {ch.incoming.title}
        </span>
        {ch.restored ? (
          <span className="rounded bg-fv-green-light px-1.5 py-0.5 text-xs font-medium text-fv-green-dark">
            restauré
          </span>
        ) : null}
      </div>
      {ch.fields.length > 0 ? (
        <ul className="mt-1.5 space-y-1 text-xs">
          {ch.fields.map((f) => (
            <li key={f.field} className="flex flex-wrap items-baseline gap-2">
              <span className="font-medium text-fv-text-secondary">
                {f.field}&nbsp;:
              </span>
              <FieldDelta old={f.old} next={f.new} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function FieldDelta({ old: oldVal, next }) {
  const fmt = (v) => (v == null || v === '' ? '∅' : String(v));
  return (
    <span className="inline-flex flex-wrap items-baseline gap-1.5">
      <del className="max-w-xs truncate rounded bg-red-50 px-1.5 py-0.5 text-fv-red line-through">
        {fmt(oldVal)}
      </del>
      <span className="text-fv-text-secondary">→</span>
      <ins className="max-w-xs truncate rounded bg-fv-green-light px-1.5 py-0.5 text-fv-green-dark no-underline">
        {fmt(next)}
      </ins>
    </span>
  );
}
