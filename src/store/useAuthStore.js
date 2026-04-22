import { create } from 'zustand';

async function apiFetch(path, options = {}) {
  const res = await fetch(path, { credentials: 'include', ...options });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  loadMe: async () => {
    set({ loading: true });
    try {
      const data = await apiFetch('/api/auth/me');
      set({ user: data.user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    set({ user: data.user });
    return data.user;
  },

  logout: async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    set({ user: null });
  },
}));
