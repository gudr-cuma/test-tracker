import { useStore } from './store/useStore.js';
import AppShell from './components/layout/AppShell.jsx';
import PlansList from './components/plans/PlansList.jsx';
import PlanDetail from './components/plans/PlanDetail.jsx';
import ImportDialog from './components/import/ImportDialog.jsx';

export default function App() {
  const currentPlanId = useStore((s) => s.currentPlanId);
  const dialog = useStore((s) => s.dialog);

  return (
    <AppShell>
      {currentPlanId ? <PlanDetail /> : <PlansList />}
      {dialog?.type === 'import' ? (
        <ImportDialog planIdContext={currentPlanId} />
      ) : null}
    </AppShell>
  );
}
