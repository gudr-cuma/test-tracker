import { create } from 'zustand';
import { plansApi, toolsApi, projectsApi } from '../api/resources.js';

/**
 * Global UI state for Test Tracker.
 *
 * - `plans`            : plan list as returned by GET /api/plans
 * - `currentPlanId`    : `null` → home (plans list). Otherwise plan detail.
 * - `currentTab`       : `'cases' | 'dashboard'` — only meaningful when
 *                         a plan is selected.
 * - `dialog`           : null or `{ type, props? }`. Used by shared dialogs
 *                         (import, create case, confirm delete, ...).
 * - `toast`            : null or `{ kind, message }`. UI shows 1 toast at a time.
 *
 * Data for the currently-selected plan (cases, runs, stats) is not kept
 * here — it's fetched on demand by the relevant views. The store is only
 * for cross-cutting UI state and the plan list.
 */
export const useStore = create((set, get) => ({
  // ── Plan list ──────────────────────────────────────────────────
  plans: [],
  plansLoading: false,
  plansError: null,
  plansLoadedOnce: false,

  loadPlans: async ({ force = false } = {}) => {
    if (!force && (get().plansLoading || get().plansLoadedOnce)) return;
    set({ plansLoading: true, plansError: null });
    try {
      const data = await plansApi.list();
      set({ plans: data.plans || [], plansLoading: false, plansLoadedOnce: true });
    } catch (e) {
      set({ plansError: String(e.message || e), plansLoading: false });
    }
  },

  refreshPlans: () => get().loadPlans({ force: true }),

  // ── Tools ──────────────────────────────────────────────────────
  tools: [],
  toolsLoading: false,
  toolsError: null,
  toolsLoadedOnce: false,

  loadTools: async ({ force = false } = {}) => {
    if (!force && (get().toolsLoading || get().toolsLoadedOnce)) return;
    set({ toolsLoading: true, toolsError: null });
    try {
      const data = await toolsApi.list();
      set({ tools: data.tools || [], toolsLoading: false, toolsLoadedOnce: true });
    } catch (e) {
      set({ toolsError: String(e.message || e), toolsLoading: false });
    }
  },
  refreshTools: () => get().loadTools({ force: true }),

  // ── Projects ───────────────────────────────────────────────────
  projects: [],
  projectsLoading: false,
  projectsError: null,
  projectsLoadedOnce: false,

  loadProjects: async ({ force = false } = {}) => {
    if (!force && (get().projectsLoading || get().projectsLoadedOnce)) return;
    set({ projectsLoading: true, projectsError: null });
    try {
      const data = await projectsApi.list();
      set({ projects: data.projects || [], projectsLoading: false, projectsLoadedOnce: true });
    } catch (e) {
      set({ projectsError: String(e.message || e), projectsLoading: false });
    }
  },
  refreshProjects: () => get().loadProjects({ force: true }),

  // ── Navigation ─────────────────────────────────────────────────
  homeTab: 'plans',
  currentPlanId: null,
  currentTab: 'cases',

  setHomeTab: (tab) => set({ homeTab: tab }),
  setCurrentPlan: (id) => set({ currentPlanId: id, currentTab: 'cases', dialog: null }),
  goHome: () => set({ currentPlanId: null, dialog: null }),
  setTab: (tab) => set({ currentTab: tab }),

  // ── Dialogs & toasts ───────────────────────────────────────────
  dialog: null,
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),

  toast: null,
  showToast: (kind, message) => set({ toast: { kind, message } }),
  clearToast: () => set({ toast: null }),
}));

// Convenience selectors
export const selectCurrentPlan = (s) =>
  s.currentPlanId ? s.plans.find((p) => p.id === s.currentPlanId) || null : null;
