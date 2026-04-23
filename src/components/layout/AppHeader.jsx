import { useState } from 'react';
import { useStore, selectCurrentPlan } from '../../store/useStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import Button from '../shared/Button.jsx';
import PlanSettingsDialog from '../plans/PlanSettingsDialog.jsx';

export default function AppHeader() {
  const plan = useStore(selectCurrentPlan);
  const currentProjectId = useStore((s) => s.currentProjectId);
  const projects = useStore((s) => s.projects);
  const project = currentProjectId ? projects.find((p) => p.id === currentProjectId) || null : null;
  const homeTab = useStore((s) => s.homeTab);
  const goHome = useStore((s) => s.goHome);
  const openDialog = useStore((s) => s.openDialog);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [planSettings, setPlanSettings] = useState(false);

  return (
    <header className="flex items-center gap-4 border-b border-fv-border bg-white px-6 py-3">
      <button
        type="button"
        onClick={goHome}
        className="flex items-center gap-2 rounded-md px-2 py-1 -ml-2 hover:bg-fv-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-fv-blue"
      >
        <span
          aria-hidden="true"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-fv-orange text-sm font-bold text-white"
        >
          TT
        </span>
        <span className="text-base font-semibold text-fv-text">Test Tracker</span>
      </button>

      {plan ? (
        <>
          <span aria-hidden="true" className="text-fv-text-secondary">/</span>
          {plan.icon ? (
            <span className="text-lg">{plan.icon}</span>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-fv-text">
              {plan.title}
            </div>
            {plan.project_name ? (
              <div className="flex items-center gap-1 truncate text-xs text-fv-text-secondary">
                <span style={{ color: plan.project_color }}>{plan.project_icon}</span>
                <span>{plan.project_name}</span>
              </div>
            ) : plan.md_filename ? (
              <div className="truncate text-xs text-fv-text-secondary">
                {plan.md_filename}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            title="Paramètres du plan"
            onClick={() => setPlanSettings(true)}
            className="rounded-md p-1.5 text-fv-text-secondary hover:bg-fv-bg-secondary hover:text-fv-text focus:outline-none focus-visible:ring-2 focus-visible:ring-fv-orange"
          >
            ⚙️
          </button>
          {user?.can_import ? (
            <Button variant="secondary" onClick={() => openDialog({ type: 'import' })}>
              Ré-importer
            </Button>
          ) : null}
        </>
      ) : project ? (
        <>
          <span aria-hidden="true" className="text-fv-text-secondary">/</span>
          <span className="text-lg">{project.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-fv-text">{project.name}</div>
            {project.tool_name ? (
              <div className="flex items-center gap-1 truncate text-xs text-fv-text-secondary">
                <span>{project.tool_icon}</span>
                <span>{project.tool_name}</span>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="flex-1" />
          {homeTab === 'plans' && user?.can_import ? (
            <Button variant="primary" onClick={() => openDialog({ type: 'import' })}>
              Importer un cahier
            </Button>
          ) : null}
        </>
      )}

      <div className="ml-auto flex items-center gap-2 pl-4">
        <span className="text-xs text-fv-text-secondary">{user?.name}</span>
        <Button variant="ghost" size="sm" onClick={logout}>
          Déconnexion
        </Button>
      </div>

      {planSettings && plan ? (
        <PlanSettingsDialog plan={plan} onClose={() => setPlanSettings(false)} />
      ) : null}
    </header>
  );
}
