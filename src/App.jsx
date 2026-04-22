import { useEffect } from 'react';
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
  const loadPlans = useStore((s) => s.loadPlans);
  const setCurrentPlan = useStore((s) => s.setCurrentPlan);

  useEffect(() => {
    loadPlans();
    const params = new URLSearchParams(window.location.search);
    const planId = params.get('plan');
    if (planId) setCurrentPlan(planId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
