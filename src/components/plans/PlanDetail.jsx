import { useStore } from '../../store/useStore.js';
import TabNav from '../layout/TabNav.jsx';
import EmptyState from '../shared/EmptyState.jsx';

/**
 * Plan detail view with tab navigation.
 * Phase 4a: placeholders for each tab. Cases + dashboard content arrive
 * in subsequent lots.
 */
export default function PlanDetail() {
  const currentTab = useStore((s) => s.currentTab);

  return (
    <div className="flex min-h-full flex-col">
      <TabNav />
      <div className="flex-1 p-6">
        {currentTab === 'cases' ? <CasesPlaceholder /> : <DashboardPlaceholder />}
      </div>
    </div>
  );
}

function CasesPlaceholder() {
  return (
    <EmptyState
      title="Cas de test — à venir"
      description="Le tableau des cas sera branché au prochain lot (4c). Vous pourrez ouvrir chaque cas pour voir la timeline des runs et les commentaires."
    />
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
