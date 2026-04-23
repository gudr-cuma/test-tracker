import { useState } from 'react';
import { checklistApi } from '../../api/resources.js';
import { useStore } from '../../store/useStore.js';
import Button from '../shared/Button.jsx';
import Spinner from '../shared/Spinner.jsx';

/**
 * Editeur de checklist séquentielle pour un cas.
 * Props:
 *   - planId, caseId
 *   - items: liste actuelle (state contrôlé par le parent)
 *   - onChange(items): appelé après chaque mutation réussie
 */
export default function ChecklistEditor({ planId, caseId, items, onChange }) {
  const showToast = useStore((s) => s.showToast);
  const [userExpanded, setUserExpanded] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');

  const expanded = userExpanded || items.length > 0;

  async function refresh() {
    const res = await checklistApi.list(planId, caseId);
    onChange(res.items || []);
  }

  async function handleAdd() {
    const label = newLabel.trim();
    if (!label) return;
    setBusy(true);
    try {
      await checklistApi.create(planId, caseId, { label });
      setNewLabel('');
      await refresh();
    } catch (e) {
      showToast('error', `Ajout impossible : ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleMove(item, delta) {
    const target = item.position + delta;
    if (target < 0 || target >= items.length) return;
    setBusy(true);
    try {
      await checklistApi.update(item.id, { position: target });
      await refresh();
    } catch (e) {
      showToast('error', `Déplacement impossible : ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Supprimer l'étape « ${item.label} » ?`)) return;
    setBusy(true);
    try {
      await checklistApi.delete(item.id);
      await refresh();
    } catch (e) {
      showToast('error', `Suppression impossible : ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditLabel(item.label);
  }

  async function commitEdit() {
    const id = editingId;
    const label = editLabel.trim();
    if (!id) return;
    if (!label) { setEditingId(null); return; }
    const original = items.find((i) => i.id === id);
    if (original && original.label === label) { setEditingId(null); return; }
    setBusy(true);
    try {
      await checklistApi.update(id, { label });
      setEditingId(null);
      await refresh();
    } catch (e) {
      showToast('error', `Modification impossible : ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  if (!expanded && items.length === 0) {
    return (
      <section className="mt-6">
        <button
          type="button"
          onClick={() => setUserExpanded(true)}
          className="text-xs font-medium text-fv-text-secondary hover:text-fv-orange"
        >
          + Ajouter une checklist
        </button>
      </section>
    );
  }

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-fv-text-secondary">
          Checklist ({items.length})
        </h3>
        {busy ? <Spinner size={12} /> : null}
      </div>

      {items.length > 0 ? (
        <ol className="space-y-1.5">
          {items.map((item, idx) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-fv-border bg-white px-2 py-1.5 text-sm"
            >
              <span className="w-6 text-right font-mono text-xs tabular-nums text-fv-text-secondary">
                {idx + 1}.
              </span>
              {editingId === item.id ? (
                <input
                  type="text"
                  autoFocus
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="min-w-0 flex-1 rounded border border-fv-orange px-2 py-0.5 text-sm focus:outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="min-w-0 flex-1 truncate text-left text-fv-text hover:text-fv-orange"
                  title="Cliquer pour éditer"
                >
                  {item.label}
                </button>
              )}
              <div className="flex shrink-0 items-center gap-0.5 text-fv-text-secondary">
                <button
                  type="button"
                  onClick={() => handleMove(item, -1)}
                  disabled={busy || idx === 0}
                  className="rounded p-1 hover:bg-fv-bg-secondary disabled:opacity-30"
                  aria-label="Monter"
                  title="Monter"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(item, +1)}
                  disabled={busy || idx === items.length - 1}
                  className="rounded p-1 hover:bg-fv-bg-secondary disabled:opacity-30"
                  aria-label="Descendre"
                  title="Descendre"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={busy}
                  className="rounded p-1 hover:bg-red-50 hover:text-fv-red disabled:opacity-50"
                  aria-label="Supprimer"
                  title="Supprimer"
                >
                  🗑
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          placeholder="Nouvelle étape…"
          className="min-w-0 flex-1 rounded-md border border-fv-border px-3 py-1.5 text-sm focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange"
          disabled={busy}
        />
        <Button variant="secondary" size="sm" onClick={handleAdd} disabled={busy || !newLabel.trim()}>
          + Ajouter
        </Button>
      </div>
    </section>
  );
}
