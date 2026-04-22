import { useEffect, useState } from 'react';
import { casesApi } from '../../api/resources.js';
import { useStore } from '../../store/useStore.js';
import Button from '../shared/Button.jsx';
import ErrorBanner from '../shared/ErrorBanner.jsx';
import Spinner from '../shared/Spinner.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';

const FIELDS = [
  ['title', 'Titre'],
  ['family', 'Famille'],
  ['priority', 'Priorité'],
  ['preconditions', 'Préconditions'],
  ['steps', 'Étapes'],
  ['expected', 'Résultat attendu'],
];

const MULTI_LINE = new Set(['preconditions', 'steps', 'expected']);
const SHORT = new Set(['family', 'priority']);

export default function CaseDetailPanel({ planId, caseItem, onClose, onUpdated }) {
  const showToast = useStore((s) => s.showToast);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(() => buildDraft(caseItem));

  useEffect(() => {
    setDraft(buildDraft(caseItem));
    setEditMode(false);
    setError(null);
  }, [caseItem?.id]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const patch = {};
    for (const [f] of FIELDS) {
      const value = draft[f];
      const current = caseItem[f] ?? '';
      if ((value ?? '') !== current) {
        patch[f] = value === '' ? null : value;
      }
    }
    if (Object.keys(patch).length === 0) {
      setEditMode(false);
      setSaving(false);
      return;
    }
    try {
      const res = await casesApi.update(planId, caseItem.id, patch);
      showToast('success', `${caseItem.id} mis à jour.`);
      setEditMode(false);
      onUpdated?.(res.case);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="flex h-full flex-col border-l border-fv-border bg-white">
      <header className="flex items-start justify-between gap-3 border-b border-fv-border px-5 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <code className="rounded bg-fv-bg-secondary px-1.5 py-0.5 font-mono text-xs text-fv-text">
              {caseItem.id}
            </code>
            <StatusBadge status={caseItem.latest_status} size="sm" />
            {caseItem.source === 'manual' ? (
              <span className="rounded bg-fv-orange-light px-1.5 py-0.5 text-[11px] font-semibold text-fv-orange-dark">
                Manuel
              </span>
            ) : null}
            {caseItem.removed_from_md ? (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-fv-text-secondary">
                Retiré du MD
              </span>
            ) : null}
          </div>
          <h2 className="mt-1 text-base font-semibold text-fv-text">
            {editMode ? draft.title || caseItem.title : caseItem.title}
          </h2>
        </div>
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className="-mr-1 rounded p-1 text-fv-text-secondary hover:bg-fv-bg-secondary hover:text-fv-text"
        >
          <span aria-hidden="true" className="text-xl leading-none">×</span>
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {error ? (
          <div className="mb-3">
            <ErrorBanner message={error} />
          </div>
        ) : null}

        <dl className="space-y-4">
          {FIELDS.map(([field, label]) => (
            <div key={field}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-fv-text-secondary">
                {label}
              </dt>
              <dd className="mt-1 text-sm text-fv-text">
                {editMode ? (
                  MULTI_LINE.has(field) ? (
                    <textarea
                      rows={4}
                      value={draft[field] ?? ''}
                      onChange={(e) =>
                        setDraft({ ...draft, [field]: e.target.value })
                      }
                      className="w-full resize-y rounded-md border border-fv-border bg-white px-3 py-2 font-mono text-xs text-fv-text focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange"
                    />
                  ) : (
                    <input
                      type="text"
                      value={draft[field] ?? ''}
                      onChange={(e) =>
                        setDraft({ ...draft, [field]: e.target.value })
                      }
                      className={[
                        'rounded-md border border-fv-border bg-white px-3 py-1.5 text-sm text-fv-text focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange',
                        SHORT.has(field) ? 'w-32' : 'w-full',
                      ].join(' ')}
                    />
                  )
                ) : (
                  <ReadOnlyValue value={caseItem[field]} multiLine={MULTI_LINE.has(field)} />
                )}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 rounded-md border border-dashed border-fv-border px-4 py-3 text-xs text-fv-text-secondary">
          La timeline des runs et les commentaires arrivent au lot 4d/4e.
        </div>
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-fv-border bg-fv-bg-secondary px-5 py-3">
        {editMode ? (
          <>
            <Button
              variant="ghost"
              disabled={saving}
              onClick={() => {
                setDraft(buildDraft(caseItem));
                setEditMode(false);
                setError(null);
              }}
            >
              Annuler
            </Button>
            <Button variant="primary" disabled={saving} onClick={handleSave}>
              {saving ? <Spinner size={14} /> : null}
              Enregistrer
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={() => setEditMode(true)}>
            Modifier
          </Button>
        )}
      </footer>
    </aside>
  );
}

function buildDraft(c) {
  if (!c) return {};
  const out = {};
  for (const [f] of FIELDS) out[f] = c[f] ?? '';
  return out;
}

function ReadOnlyValue({ value, multiLine }) {
  if (!value) {
    return <span className="italic text-fv-text-secondary">—</span>;
  }
  if (multiLine) {
    return (
      <pre className="whitespace-pre-wrap rounded-md bg-fv-bg-secondary px-3 py-2 font-mono text-xs text-fv-text">
        {value}
      </pre>
    );
  }
  return <span>{value}</span>;
}
