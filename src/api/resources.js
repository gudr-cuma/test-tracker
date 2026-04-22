import { api } from './client.js';

// ─── Plans ──────────────────────────────────────────────────────────
export const plansApi = {
  list: () => api.get('/api/plans'),
  get: (id, { withMd = false } = {}) =>
    api.get(`/api/plans/${encodeURIComponent(id)}${withMd ? '?md=1' : ''}`),
  archive: (id) => api.delete(`/api/plans/${encodeURIComponent(id)}`),
};

// ─── Import (markdown diff) ────────────────────────────────────────
export const importApi = {
  dryRun: ({ md, filename, planId }) =>
    api.post('/api/plans/import/dry-run', { md, filename, planId }),
  apply: ({ md, filename, planId, accepted }) =>
    api.post('/api/plans/import/apply', { md, filename, planId, accepted }),
};

// ─── Cases ──────────────────────────────────────────────────────────
export const casesApi = {
  list: (planId) =>
    api.get(`/api/cases?plan=${encodeURIComponent(planId)}`),
  create: (planId, data) =>
    api.post('/api/cases', { planId, ...data }),
  update: (planId, caseId, patch) =>
    api.patch(
      `/api/cases/${encodeURIComponent(caseId)}?plan=${encodeURIComponent(planId)}`,
      patch,
    ),
};

// ─── Runs ───────────────────────────────────────────────────────────
export const runsApi = {
  list: (planId, caseId) =>
    api.get(
      `/api/runs?plan=${encodeURIComponent(planId)}&case=${encodeURIComponent(caseId)}`,
    ),
  create: (planId, caseId, data) =>
    api.post('/api/runs', { planId, caseId, ...data }),
  update: (runId, patch) =>
    api.patch(`/api/runs/${encodeURIComponent(runId)}`, patch),
  delete: (runId) =>
    api.delete(`/api/runs/${encodeURIComponent(runId)}`),
};

// ─── Comments ───────────────────────────────────────────────────────
export const commentsApi = {
  list: (targetType, targetId) =>
    api.get(
      `/api/comments?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`,
    ),
  create: (targetType, targetId, body) =>
    api.post('/api/comments', { targetType, targetId, body }),
};

// ─── Testers ────────────────────────────────────────────────────────
export const testersApi = {
  list: () => api.get('/api/testers'),
};

// ─── Stats ──────────────────────────────────────────────────────────
export const statsApi = {
  get: (planId) =>
    api.get(`/api/stats?plan=${encodeURIComponent(planId)}`),
};
