import { useState } from 'react';
import Button from '../shared/Button.jsx';
import Spinner from '../shared/Spinner.jsx';
import ErrorBanner from '../shared/ErrorBanner.jsx';

async function apiFetch(path, options = {}) {
  const res = await fetch(path, { credentials: 'include', ...options });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const FLAGS = [
  { key: 'is_admin', label: 'Administrateur (accès panel admin)' },
  { key: 'can_import', label: 'Peut importer un cahier de test' },
  { key: 'admin_plans', label: 'Voit tous les cahiers de test' },
];

export default function UserFormDialog({ user, onSaved, onClose }) {
  const isEdit = Boolean(user?.id);
  const [email, setEmail] = useState(user?.email ?? '');
  const [name, setName] = useState(user?.name ?? '');
  const [password, setPassword] = useState('');
  const [flags, setFlags] = useState({
    is_admin: Boolean(user?.is_admin),
    can_import: Boolean(user?.can_import),
    admin_plans: Boolean(user?.admin_plans),
    is_active: user ? Boolean(user.is_active) : true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function toggleFlag(key) {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isEdit && !password) {
      setError('Le mot de passe est obligatoire pour un nouvel utilisateur');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const body = {
        email: email.trim(),
        name: name.trim(),
        is_active: flags.is_active ? 1 : 0,
        is_admin: flags.is_admin ? 1 : 0,
        can_import: flags.can_import ? 1 : 0,
        admin_plans: flags.admin_plans ? 1 : 0,
      };
      if (password) body.password = password;

      let data;
      if (isEdit) {
        data = await apiFetch(`/api/admin/users/${user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        onSaved(data.user);
      } else {
        data = await apiFetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        onSaved({ ...data.user, ...body });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-fv-border bg-white shadow-lg">
        <header className="flex items-center justify-between border-b border-fv-border px-6 py-4">
          <h2 className="font-semibold text-fv-text">
            {isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-fv-text-secondary hover:bg-fv-bg-secondary"
            aria-label="Fermer"
          >
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          {error ? <ErrorBanner message={error} /> : null}

          <div>
            <label className="mb-1 block text-sm font-medium text-fv-text" htmlFor="uf-name">Nom</label>
            <input
              id="uf-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-fv-border bg-white px-3 py-2 text-sm text-fv-text focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-fv-text" htmlFor="uf-email">Email</label>
            <input
              id="uf-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-fv-border bg-white px-3 py-2 text-sm text-fv-text focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-fv-text" htmlFor="uf-password">
              Mot de passe {isEdit ? '(laisser vide = inchangé)' : ''}
            </label>
            <input
              id="uf-password"
              type="password"
              required={!isEdit}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-md border border-fv-border bg-white px-3 py-2 text-sm text-fv-text focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-fv-text">Droits</legend>
            {FLAGS.map(({ key, label }) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-fv-text">
                <input
                  type="checkbox"
                  checked={Boolean(flags[key])}
                  onChange={() => toggleFlag(key)}
                  className="accent-fv-orange"
                />
                {label}
              </label>
            ))}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-fv-text">
              <input
                type="checkbox"
                checked={Boolean(flags.is_active)}
                onChange={() => toggleFlag('is_active')}
                className="accent-fv-orange"
              />
              Compte actif
            </label>
          </fieldset>

          <footer className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? <Spinner size={14} /> : null}
              {isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </footer>
        </form>
      </div>
    </div>
  );
}
