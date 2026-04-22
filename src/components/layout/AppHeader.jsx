import { useStore, selectCurrentPlan } from '../../store/useStore.js';
import Button from '../shared/Button.jsx';

export default function AppHeader() {
  const plan = useStore(selectCurrentPlan);
  const goHome = useStore((s) => s.goHome);
  const openDialog = useStore((s) => s.openDialog);

  return (
    <header className="flex items-center gap-4 border-b border-fv-border bg-white px-6 py-3">
      <button
        type="button"
        onClick={goHome}
        className="flex items-center gap-2 rounded-md px-2 py-1 -ml-2 hover:bg-fv-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-fv-blue"
      >
        <span
          aria-hidden="true"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-fv-orange text-sm font-bold text-white"
        >
          TT
        </span>
        <span className="text-base font-semibold text-fv-text">Test Tracker</span>
      </button>

      {plan ? (
        <>
          <span aria-hidden="true" className="text-fv-text-secondary">/</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-fv-text">
              {plan.title}
            </div>
            {plan.md_filename ? (
              <div className="truncate text-xs text-fv-text-secondary">
                {plan.md_filename}
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="flex-1" />
      )}

      <Button variant="primary" onClick={() => openDialog({ type: 'import' })}>
        Importer un cahier
      </Button>
    </header>
  );
}
