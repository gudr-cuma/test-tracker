import { api } from './client.js';

// ─── Plans ──────────────────────────────────────────────────────────
export const plansApi = {
  list: () => api.get('/api/plans'),
  get: (id, { withMd = false } = {}) =>
    api.get(`/api/plans/${encodeURIComponent(id)}${withMd ? '?md=1' : ''}`),
  create: (body) => api.post('/api/plans', body),
  update: (id, patch) => api.patch(`/api/plans/${encodeURIComponent(id)}`, patch),
  archive: (id) => api.delete(`/api/plans/${encodeURIComponent(id)}`),
};

// ─── Import (markdown ou excel) ────────────────────────────────────
export const importApi = {
  dryRun: ({ md, filename, planId, cases, title }) =>
    api.post('/api/plans/import/dry-run', { md, filename, planId, cases, title }),
  apply: ({ md, filename, planId, accepted, cases, title }) =>
    api.post('/api/plans/import/apply', { md, filename, planId, accepted, cases, title }),
};

// ─── Tools ──────────────────────────────────────────────────────────
export const toolsApi = {
  list: () => api.get('/api/tools'),
  create: (body) => api.post('/api/tools', body),
  update: (id, patch) => api.patch(`/api/tools/${encodeURIComponent(id)}`, patch),
  delete: (id) => api.delete(`/api/tools/${encodeURIComponent(id)}`),
};

// ─── Projects ───────────────────────────────────────────────────────
export const projectsApi = {
  list: () => api.get('/api/projects'),
  create: (body) => api.post('/api/projects', body),
  update: (id, patch) => api.patch(`/api/projects/${encodeURIComponent(id)}`, patch),
  delete: (id) => api.delete(`/api/projects/${encodeURIComponent(id)}`),
};

// ─── Cases ──────────────────────────────────────────────────────────
// Note: POST /api/cases expects snake_case body (`plan_id`) matching D1
// column names, while import endpoints use camelCase. Don't unify — just
// map here.
export const casesApi = {
  list: (planId) =>
    api.get(`/api/cases?plan=${encodeURIComponent(planId)}`),
  create: (planId, { id, family, title, preconditions, steps, expected, priority }) =>
    api.post('/api/cases', {
      plan_id: planId,
      id,
      family,
      title,
      preconditions,
      steps,
      expected,
      priority,
    }),
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
  create: (planId, caseId, { status = 'a-faire', tester_id, checklist_item_id } = {}) =>
    api.post('/api/runs', {
      plan_id: planId,
      case_id: caseId,
      status,
      tester_id,
      checklist_item_id,
    }),
  update: (runId, patch) =>
    api.patch(`/api/runs/${encodeURIComponent(runId)}`, patch),
  delete: (runId) =>
    api.delete(`/api/runs/${encodeURIComponent(runId)}`),
};

// ─── Checklist ──────────────────────────────────────────────────────
export const checklistApi = {
  list: (planId, caseId) =>
    api.get(`/api/checklist?plan=${encodeURIComponent(planId)}&case=${encodeURIComponent(caseId)}`),
  create: (planId, caseId, { label, position }) =>
    api.post(`/api/checklist?plan=${encodeURIComponent(planId)}&case=${encodeURIComponent(caseId)}`,
             { label, position }),
  update: (itemId, patch) =>
    api.patch(`/api/checklist/${encodeURIComponent(itemId)}`, patch),
  delete: (itemId) =>
    api.delete(`/api/checklist/${encodeURIComponent(itemId)}`),
};

// ─── Comments ───────────────────────────────────────────────────────
export const commentsApi = {
  list: (targetType, targetId) =>
    api.get(
      `/api/comments?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`,
    ),
  create: (targetType, targetId, body) =>
    api.post('/api/comments', {
      target_type: targetType,
      target_id: targetId,
      body,
    }),
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
