import { useMemo, useState } from 'react';
import { casesApi } from '../../api/resources.js';
import { useStore } from '../../store/useStore.js';
import Button from '../shared/Button.jsx';
import ErrorBanner from '../shared/ErrorBanner.jsx';
import Modal from '../shared/Modal.jsx';
import Spinner from '../shared/Spinner.jsx';

const ID_PATTERN = /^TC-[A-Z]+-\d+$/;

/**
 * Create a manual case. Suggests the next free ID for the chosen family
 * based on existing cases in this plan. Pre-fills the family from the ID
 * once it's typed.
 */
export default function NewCaseDialog({ planId, existingCases, onCreated, onClose }) {
  const showToast = useStore((s) => s.showToast);

  const families = useMemo(() => {
    const set = new Set();
    for (const c of existingCases) if (c.family) set.add(c.family);
    return [...set].sort();
  }, [existingCases]);

  const [form, setForm] = useState({
    id: '',
    title: '',
    family: families[0] || 'MANUAL',
    priority: 'P2',
    preconditions: '',
    steps: '',
    expected: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Auto-suggest an ID when family changes and id is empty or auto-filled.
  const idLooksAutoFilled = !form.id || /^TC-[A-Z]+-\d+$/.test(form.id);
  function handleFamilyChange(family) {
    const next = { ...form, family };
    if (idLooksAutoFilled && family) {
      next.id = suggestNextId(family, existingCases);
    }
    setForm(next);
  }

  function set(field, value) {
    setForm({ ...form, [field]: value });
  }

  const idValid = ID_PATTERN.test(form.id);
  const titleValid = form.title.trim().length > 0;
  const canSubmit = idValid && titleValid && !saving;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        id: form.id.trim(),
        title: form.title.trim(),
        family: form.family.trim() || null,
        priority: form.priority || null,
        preconditions: form.preconditions || null,
        steps: form.steps || null,
        expected: form.expected || null,
      };
      const res = await casesApi.create(planId, payload);
      showToast('success', `Cas ${payload.id} créé.`);
      onCreated?.(res.case);
      onClose();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={saving}>
        Annuler
      </Button>
      <Button
        variant="primary"
        type="submit"
        form="new-case-form"
        disabled={!canSubmit}
      >
        {saving ? <Spinner size={14} /> : null}
        Créer
      </Button>
    </>
  );

  return (
    <Modal title="Nouveau cas manuel" onClose={onClose} size="lg" footer={footer} dismissible={!saving}>
      {error ? (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      ) : null}

      <form id="new-case-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Famille" hint="ex. INIT, AUTH, SEARCH — majuscules uniquement">
            <input
              list="family-options"
              value={form.family}
              onChange={(e) => handleFamilyChange(e.target.value.toUpperCase())}
              className={inputCls}
            />
            <datalist id="family-options">
              {families.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </Field>
          <Field
            label="ID"
            hint={idValid ? 'format valide' : 'Format : TC-FAMILLE-NN'}
            error={form.id && !idValid ? 'Format invalide.' : null}
          >
            <input
              value={form.id}
              onChange={(e) => set('id', e.target.value.toUpperCase())}
              className={inputCls}
              placeholder="TC-INIT-99"
            />
          </Field>
        </div>

        <Field label="Titre" required>
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            className={inputCls}
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Priorité">
            <select
              value={form.priority}
              onChange={(e) => set('priority', e.target.value)}
              className={inputCls}
            >
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
            </select>
          </Field>
        </div>

        <Field label="Préconditions">
          <textarea
            rows={2}
            value={form.preconditions}
            onChange={(e) => set('preconditions', e.target.value)}
            className={textareaCls}
          />
        </Field>

        <Field label="Étapes">
          <textarea
            rows={3}
            value={form.steps}
            onChange={(e) => set('steps', e.target.value)}
            className={textareaCls}
          />
        </Field>

        <Field label="Résultat attendu">
          <textarea
            rows={2}
            value={form.expected}
            onChange={(e) => set('expected', e.target.value)}
            className={textareaCls}
          />
        </Field>
      </form>
    </Modal>
  );
}

const inputCls =
  'w-full rounded-md border border-fv-border bg-white px-3 py-1.5 text-sm text-fv-text focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange';

const textareaCls =
  'w-full resize-y rounded-md border border-fv-border bg-white px-3 py-2 font-mono text-xs text-fv-text focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange';

function Field({ label, required = false, hint, error, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-fv-text-secondary">
        {label}
        {required ? <span className="ml-0.5 text-fv-red">*</span> : null}
      </span>
      <div className="mt-1">{children}</div>
      {error ? (
        <span className="mt-1 block text-xs text-fv-red">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-fv-text-secondary">{hint}</span>
      ) : null}
    </label>
  );
}

/**
 * Find the highest number used for this family in the current plan and
 * suggest the next one. Falls back to TC-<FAMILY>-01 if none exist.
 */
function suggestNextId(family, existingCases) {
  const prefix = `TC-${family}-`;
  let max = 0;
  for (const c of existingCases) {
    if (!c.id.startsWith(prefix)) continue;
    const n = parseInt(c.id.slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(2, '0')}`;
}
