import { useStore } from '../../store/useStore.js';
import CasesView from '../cases/CasesView.jsx';
import TabNav from '../layout/TabNav.jsx';
import EmptyState from '../shared/EmptyState.jsx';

/**
 * Plan detail view with tab navigation.
 * - Cases tab: full table + detail panel + manual create (lot 4c).
 * - Dashboard tab: placeholder, wired in Phase 6.
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
          <DashboardPlaceholder />
        )}
      </div>
    </div>
  );
}

function DashboardPlaceholder() {
  return (
    <EmptyState
      title="Tableau de bord — à venir"
      description="Les 4 graphiques (donut statut, barres par famille, courbe cumulative fait/clos, top 10 instabilité) sont implémentés côté API et seront branchés en Phase 6."
    />
  );
}
