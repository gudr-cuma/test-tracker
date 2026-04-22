import { useStore } from '../../store/useStore.js';
import CasesView from '../cases/CasesView.jsx';
import DashboardView from '../dashboard/DashboardView.jsx';
import TabNav from '../layout/TabNav.jsx';

/**
 * Plan detail view with tab navigation.
 * - Cases tab: full table + detail panel + manual create (lot 4c).
 * - Dashboard tab: 4 graphs branchés sur /api/stats (Phase 6).
 */
export default function PlanDetail() {
  const currentTab = useStore((s) => s.currentTab);
  const currentPlanId = useStore((s) => s.currentPlanId);

  return (
    <div className="flex min-h-full flex-col">
      <TabNav />
      <div className="flex min-h-0 flex-1 flex-col p-6">
        {currentTab === 'cases' ? (
          <CasesView planId={currentPlanId} />
        ) : (
          <DashboardView planId={currentPlanId} />
        )}
      </div>
    </div>
  );
}
