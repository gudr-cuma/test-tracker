import { useEffect } from 'react';
import { useStore } from '../../store/useStore.js';
import Button from '../shared/Button.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import ErrorBanner from '../shared/ErrorBanner.jsx';
import Spinner from '../shared/Spinner.jsx';
import PlanCard from './PlanCard.jsx';

export default function PlansList() {
  const plans = useStore((s) => s.plans);
  const loading = useStore((s) => s.plansLoading);
  const error = useStore((s) => s.plansError);
  const loadedOnce = useStore((s) => s.plansLoadedOnce);
  const loadPlans = useStore((s) => s.loadPlans);
  const refreshPlans = useStore((s) => s.refreshPlans);
  const openDialog = useStore((s) => s.openDialog);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-fv-text">Cahiers de test</h1>
          <p className="mt-1 text-sm text-fv-text-secondary">
            Importez un cahier markdown, puis suivez les exécutions au fil de l&rsquo;eau.
          </p>
        </div>
        <Button variant="primary" onClick={() => openDialog({ type: 'import' })}>
          Importer un cahier
        </Button>
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
          description="Importez votre premier fichier markdown pour créer un cahier. Les cas de test seront extraits automatiquement."
          action={
            <Button variant="primary" onClick={() => openDialog({ type: 'import' })}>
              Importer un cahier
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}
