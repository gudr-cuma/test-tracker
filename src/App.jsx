import { useEffect, useState } from 'react';
import { useStore } from './store/useStore.js';
import { useAuthStore } from './store/useAuthStore.js';
import AppShell from './components/layout/AppShell.jsx';
import HomeTabNav from './components/layout/HomeTabNav.jsx';
import PlansList from './components/plans/PlansList.jsx';
import PlanDetail from './components/plans/PlanDetail.jsx';
import ToolsList from './components/tools/ToolsList.jsx';
import ProjectsList from './components/projects/ProjectsList.jsx';
import ImportDialog from './components/import/ImportDialog.jsx';
import LoginPage from './components/auth/LoginPage.jsx';
import BootstrapPage from './components/auth/BootstrapPage.jsx';
import AdminPanel from './components/admin/AdminPanel.jsx';
import Spinner from './components/shared/Spinner.jsx';

export default function App() {
  const currentPlanId = useStore((s) => s.currentPlanId);
  const homeTab = useStore((s) => s.homeTab);
  const dialog = useStore((s) => s.dialog);
  const loadPlans = useStore((s) => s.loadPlans);
  const setCurrentPlan = useStore((s) => s.setCurrentPlan);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const loadMe = useAuthStore((s) => s.loadMe);
  const [bootstrapAvailable, setBootstrapAvailable] = useState(false);

  useEffect(() => {
    loadMe().then(() => {
      // Vérifie si le bootstrap est nécessaire (aucun user en base)
      fetch('/api/auth/bootstrap', { credentials: 'include' })
        .then((r) => r.json())
        .then((d) => setBootstrapAvailable(Boolean(d.available)))
        .catch(() => {});
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    loadPlans();
    const params = new URLSearchParams(window.location.search);
    const planId = params.get('plan');
    if (planId) setCurrentPlan(planId);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  if (!user) {
    return bootstrapAvailable ? <BootstrapPage /> : <LoginPage />;
  }

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
          {homeTab === 'admin'   && <AdminPanel />}
        </>
      )}
      {dialog?.type === 'import' ? (
        <ImportDialog planIdContext={currentPlanId} />
      ) : null}
    </AppShell>
  );
}
