import { useState } from 'react';
import { formatDate } from '../../engine/formatUtils.js';
import { useStore } from '../../store/useStore.js';
import { casesApi } from '../../api/resources.js';
import { exportCasesToXlsx } from '../../lib/exportXlsx.js';
import Spinner from '../shared/Spinner.jsx';
import PlanSettingsDialog from './PlanSettingsDialog.jsx';

export default function PlanCard({ plan }) {
  const setCurrentPlan = useStore((s) => s.setCurrentPlan);
  const [exporting, setExporting] = useState(false);
  const [settings, setSettings] = useState(false);

  async function handleExport(e) {
    e.stopPropagation();
    setExporting(true);
    try {
      const data = await casesApi.list(plan.id);
      const cases = (data.cases || []).filter((c) => !c.removed_from_md);
      exportCasesToXlsx(plan.title, cases);
    } catch {
      // silent — user can retry
    } finally {
      setExporting(false);
    }
  }

  function handleSettings(e) {
    e.stopPropagation();
    setSettings(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setCurrentPlan(plan.id)}
        className="group flex flex-col items-stretch rounded-lg border border-fv-border bg-white p-5 text-left transition hover:border-fv-orange hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-fv-orange"
      >
        {plan.color ? (
          <div className="mb-3 h-1 w-full rounded-full" style={{ backgroundColor: plan.color }} />
        ) : null}

        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            {plan.icon ? <span className="text-xl flex-shrink-0">{plan.icon}</span> : null}
            <h3 className="line-clamp-2 text-base font-semibold text-fv-text group-hover:text-fv-orange-dark">
              {plan.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleSettings}
            title="Paramètres du plan"
            className="flex-shrink-0 rounded p-1 text-fv-text-secondary opacity-0 transition hover:bg-fv-bg-secondary hover:text-fv-text group-hover:opacity-100 focus:outline-none focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-fv-orange"
          >
            ⚙️
          </button>
        </div>

        {plan.project_name ? (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-sm" style={{ color: plan.project_color }}>{plan.project_icon}</span>
            <span className="truncate text-xs text-fv-text-secondary">{plan.project_name}</span>
          </div>
        ) : (
          <p className="mt-1 truncate text-xs text-fv-text-secondary italic">
            {plan.md_filename || 'Aucun projet lié'}
          </p>
        )}

        {plan.owner_name ? (
          <p className="mt-0.5 truncate text-xs text-fv-text-secondary">
            👤 {plan.owner_name}
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              title="Exporter en Excel"
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-fv-text-secondary hover:bg-fv-bg-secondary hover:text-fv-text focus:outline-none focus-visible:ring-1 focus-visible:ring-fv-orange disabled:opacity-50"
            >
              {exporting ? <Spinner size={12} /> : '⬇'}
              <span>xlsx</span>
            </button>
            <span aria-hidden="true" className="text-fv-orange group-hover:translate-x-0.5 transition">
              →
            </span>
          </div>
        </div>
      </button>

      {settings ? (
        <PlanSettingsDialog plan={plan} onClose={() => setSettings(false)} />
      ) : null}
    </>
  );
}
