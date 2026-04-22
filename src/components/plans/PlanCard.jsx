import { formatDate } from '../../engine/formatUtils.js';
import { useStore } from '../../store/useStore.js';

export default function PlanCard({ plan }) {
  const setCurrentPlan = useStore((s) => s.setCurrentPlan);
  return (
    <button
      type="button"
      onClick={() => setCurrentPlan(plan.id)}
      className="group flex flex-col items-stretch rounded-lg border border-fv-border bg-white p-5 text-left transition hover:border-fv-orange hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-fv-orange"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-base font-semibold text-fv-text group-hover:text-fv-orange-dark">
          {plan.title}
        </h3>
      </div>
      {plan.md_filename ? (
        <p className="mt-1 truncate text-xs text-fv-text-secondary">
          {plan.md_filename}
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-fv-text-secondary">Cas</dt>
          <dd className="mt-0.5 text-lg font-semibold text-fv-text">
            {plan.case_count ?? 0}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-fv-text-secondary">Runs</dt>
          <dd className="mt-0.5 text-lg font-semibold text-fv-text">
            {plan.run_count ?? 0}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-fv-border pt-3 text-xs text-fv-text-secondary">
        <span>
          Dernier import&nbsp;:{' '}
          <span className="font-medium text-fv-text">
            {formatDate(plan.last_imported_at || plan.created_at)}
          </span>
        </span>
        <span aria-hidden="true" className="text-fv-orange group-hover:translate-x-0.5 transition">
          →
        </span>
      </div>
    </button>
  );
}
