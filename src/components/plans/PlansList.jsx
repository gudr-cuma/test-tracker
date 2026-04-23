import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import Button from '../shared/Button.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import ErrorBanner from '../shared/ErrorBanner.jsx';
import Spinner from '../shared/Spinner.jsx';
import PlanCard from './PlanCard.jsx';
import NewPlanDialog from './NewPlanDialog.jsx';

export default function PlansList() {
  const plans = useStore((s) => s.plans);
  const loading = useStore((s) => s.plansLoading);
  const error = useStore((s) => s.plansError);
  const loadedOnce = useStore((s) => s.plansLoadedOnce);
  const loadPlans = useStore((s) => s.loadPlans);
  const refreshPlans = useStore((s) => s.refreshPlans);
  const openDialog = useStore((s) => s.openDialog);
  const canImport = useAuthStore((s) => s.user?.can_import);

  const [newPlanOpen, setNewPlanOpen] = useState(false);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-fv-text">Cahiers de test</h1>
          <p className="mt-1 text-sm text-fv-text-secondary">
            Créez un cahier vide ou importez un fichier existant.
          </p>
        </div>
        {canImport ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setNewPlanOpen(true)}>
              + Nouveau cahier
            </Button>
            <Button variant="primary" onClick={() => openDialog({ type: 'import' })}>
              Importer un cahier
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={refreshPlans} />
        </div>
      ) : null}

      {loading && !loadedOnce ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size={28} />
        </div>
      ) : plans.length === 0 && loadedOnce ? (
        <EmptyState
          title="Aucun cahier pour l'instant"
          description="Créez un cahier vide pour commencer à saisir des cas manuellement, ou importez un fichier markdown / Excel."
          action={
            canImport ? (
              <div className="flex gap-2">
                <Button variant="primary" onClick={() => setNewPlanOpen(true)}>
                  + Nouveau cahier
                </Button>
                <Button variant="secondary" onClick={() => openDialog({ type: 'import' })}>
                  Importer un cahier
                </Button>
              </div>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}

      {newPlanOpen ? (
        <NewPlanDialog onClose={() => setNewPlanOpen(false)} />
      ) : null}
    </div>
  );
}
