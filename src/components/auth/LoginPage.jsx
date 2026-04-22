import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';
import Button from '../shared/Button.jsx';
import Spinner from '../shared/Spinner.jsx';

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-fv-bg-secondary px-4">
      <div className="w-full max-w-sm rounded-xl border border-fv-border bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-fv-text">
          Test Tracker
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-fv-text" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-fv-border bg-white px-3 py-2 text-sm text-fv-text focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-fv-text" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-fv-border bg-white px-3 py-2 text-sm text-fv-text focus:border-fv-orange focus:outline-none focus:ring-1 focus:ring-fv-orange"
            />
          </div>

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="w-full justify-center"
          >
            {loading ? <Spinner size={14} /> : null}
            Se connecter
          </Button>
        </form>
      </div>
    </div>
  );
}
