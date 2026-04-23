import { useStore } from '../../store/useStore.js';
import ProjectCasesView from './ProjectCasesView.jsx';
import ProjectDashboard from './ProjectDashboard.jsx';

const TABS = [
  { id: 'cases', label: 'Vue croisée' },
  { id: 'dashboard', label: 'Tableau de bord' },
];

/**
 * Vue détail d'un projet avec deux onglets :
 * - Vue croisée : tous les cas de test × tous les cahiers du projet
 * - Tableau de bord : stats d'avancement par utilisateur
 */
export default function ProjectDetail({ projectId }) {
  const currentTab = useStore((s) => s.currentTab);
  const setTab = useStore((s) => s.setTab);

  return (
    <div className="flex min-h-full flex-col">
      {/* Tab nav */}
      <nav className="border-b border-fv-border bg-white px-6">
        <ul className="flex gap-1">
          {TABS.map((t) => {
            const active = t.id === currentTab;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={[
                    'border-b-2 px-3 py-2.5 text-sm font-medium transition',
                    active
                      ? 'border-fv-orange text-fv-text'
                      : 'border-transparent text-fv-text-secondary hover:text-fv-text',
                  ].join(' ')}
                  aria-current={active ? 'page' : undefined}
                >
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex min-h-0 flex-1 flex-col p-6">
        {currentTab === 'cases' ? (
          <ProjectCasesView projectId={projectId} />
        ) : (
          <ProjectDashboard projectId={projectId} />
        )}
      </div>
    </div>
  );
}
