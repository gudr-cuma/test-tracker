import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';
import Button from '../shared/Button.jsx';
import Spinner from '../shared/Spinner.jsx';

export default function BootstrapPage() {
  const login = useAuthStore((s) => s.login);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      // Connexion automatique après création
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Erreur lors de la création');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-fv-bg-secondary px-4">
      <div className="w-full max-w-sm rounded-xl border border-fv-border bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-fv-orange text-xl font-bold text-white">
            TT
          </span>
          <h1 className="mt-3 text-xl font-bold text-fv-text">Bienvenue dans Test Tracker</h1>
          <p className="mt-1 text-sm text-fv-text-secondary">
            Crée le compte administrateur pour commencer.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-fv-text" htmlFor="bs-name">
              Nom complet
            </label>
            <input
              id="bs-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-fv-border bg-white px-3 py-2 text-sm text-fv-text focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-fv-text" htmlFor="bs-email">
              Email
            </label>
            <input
              id="bs-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-fv-border bg-white px-3 py-2 text-sm text-fv-text focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-fv-text" htmlFor="bs-pw">
              Mot de passe
            </label>
            <input
              id="bs-pw"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-fv-border bg-white px-3 py-2 text-sm text-fv-text focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-fv-text" htmlFor="bs-confirm">
              Confirmer le mot de passe
            </label>
            <input
              id="bs-confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-md border border-fv-border bg-white px-3 py-2 text-sm text-fv-text focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange"
            />
          </div>

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <Button type="submit" variant="primary" disabled={loading} className="w-full justify-center">
            {loading ? <Spinner size={14} /> : null}
            Créer mon compte admin
          </Button>
        </form>
      </div>
    </div>
  );
}
