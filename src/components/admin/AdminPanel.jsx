import { useCallback, useEffect, useState } from 'react';
import Button from '../shared/Button.jsx';
import ErrorBanner from '../shared/ErrorBanner.jsx';
import Spinner from '../shared/Spinner.jsx';
import UserFormDialog from './UserFormDialog.jsx';

async function apiFetch(path, options = {}) {
  const res = await fetch(path, { credentials: 'include', ...options });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const FLAG_LABELS = [
  { key: 'is_admin', label: 'Admin' },
  { key: 'can_import', label: 'Peut importer' },
  { key: 'admin_plans', label: 'Voit tous les plans' },
];

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formUser, setFormUser] = useState(null); // null = closed, {} = create, {...} = edit
  const [busyIds, setBusyIds] = useState(new Set());

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/api/admin/users');
      setUsers(data.users || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  function markBusy(id, on) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      on ? next.add(id) : next.delete(id);
      return next;
    });
  }

  async function handleToggleActive(user) {
    markBusy(user.id, true);
    try {
      const data = await apiFetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: user.is_active ? 0 : 1 }),
      });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? data.user : u)));
    } catch (e) {
      setError(e.message);
    } finally {
      markBusy(user.id, false);
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Supprimer l'utilisateur « ${user.name} » ?`)) return;
    markBusy(user.id, true);
    try {
      await apiFetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (e) {
      setError(e.message);
    } finally {
      markBusy(user.id, false);
    }
  }

  function handleSaved(savedUser) {
    setUsers((prev) => {
      const exists = prev.find((u) => u.id === savedUser.id);
      return exists
        ? prev.map((u) => (u.id === savedUser.id ? savedUser : u))
        : [...prev, savedUser];
    });
    setFormUser(null);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-fv-text">Gestion des utilisateurs</h2>
        <Button variant="primary" onClick={() => setFormUser({})}>
          + Nouvel utilisateur
        </Button>
      </div>

      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

      {loading && users.length === 0 ? (
        <div className="flex justify-center py-12"><Spinner size={24} /></div>
      ) : users.length === 0 ? (
        <div className="rounded-md border border-dashed border-fv-border p-8 text-center text-sm text-fv-text-secondary">
          Aucun utilisateur.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-fv-border">
          <table className="w-full text-sm">
            <thead className="bg-fv-bg-secondary text-left">
              <tr>
                <th className="px-4 py-2 font-semibold text-fv-text-secondary">Nom</th>
                <th className="px-4 py-2 font-semibold text-fv-text-secondary">Email</th>
                <th className="px-4 py-2 font-semibold text-fv-text-secondary">Droits</th>
                <th className="px-4 py-2 font-semibold text-fv-text-secondary">Actif</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-fv-border">
              {users.map((u) => (
                <tr key={u.id} className="bg-white hover:bg-fv-bg-secondary/40">
                  <td className="px-4 py-2 font-medium text-fv-text">{u.name}</td>
                  <td className="px-4 py-2 text-fv-text-secondary">{u.email}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {FLAG_LABELS.filter((f) => u[f.key]).map((f) => (
                        <span
                          key={f.key}
                          className="rounded bg-fv-orange-light px-1.5 py-0.5 text-[11px] font-semibold text-fv-orange-dark"
                        >
                          {f.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      disabled={busyIds.has(u.id)}
                      onClick={() => handleToggleActive(u)}
                      className={[
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                        u.is_active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                      ].join(' ')}
                    >
                      {u.is_active ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busyIds.has(u.id)}
                        onClick={() => setFormUser(u)}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyIds.has(u.id)}
                        onClick={() => handleDelete(u)}
                        className="text-fv-red hover:bg-red-50"
                      >
                        Supprimer
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formUser !== null ? (
        <UserFormDialog
          user={formUser.id ? formUser : null}
          onSaved={handleSaved}
          onClose={() => setFormUser(null)}
        />
      ) : null}
    </div>
  );
}
