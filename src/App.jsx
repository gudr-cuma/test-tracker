import { useStore } from './store/useStore.js';
import AppShell from './components/layout/AppShell.jsx';
import HomeTabNav from './components/layout/HomeTabNav.jsx';
import PlansList from './components/plans/PlansList.jsx';
import PlanDetail from './components/plans/PlanDetail.jsx';
import ToolsList from './components/tools/ToolsList.jsx';
import ProjectsList from './components/projects/ProjectsList.jsx';
import ImportDialog from './components/import/ImportDialog.jsx';

export default function App() {
  const currentPlanId = useStore((s) => s.currentPlanId);
  const homeTab = useStore((s) => s.homeTab);
  const dialog = useStore((s) => s.dialog);

  return (
    <AppShell>
      {currentPlanId ? (
        <PlanDetail />
      ) : (
        <>
          <HomeTabNav />
          {homeTab === 'outils'  && <ToolsList />}
          {homeTab === 'projets' && <ProjectsList />}
          {homeTab === 'plans'   && <PlansList />}
        </>
      )}
      {dialog?.type === 'import' ? (
        <ImportDialog planIdContext={currentPlanId} />
      ) : null}
    </AppShell>
  );
}
