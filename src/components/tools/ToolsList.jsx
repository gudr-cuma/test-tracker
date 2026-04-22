import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore.js';
import Button from '../shared/Button.jsx';
import Spinner from '../shared/Spinner.jsx';
import ErrorBanner from '../shared/ErrorBanner.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import ToolCard from './ToolCard.jsx';
import ToolFormDialog from './ToolFormDialog.jsx';

export default function ToolsList() {
  const tools = useStore((s) => s.tools);
  const toolsLoading = useStore((s) => s.toolsLoading);
  const toolsError = useStore((s) => s.toolsError);
  const toolsLoadedOnce = useStore((s) => s.toolsLoadedOnce);
  const loadTools = useStore((s) => s.loadTools);
  const refreshTools = useStore((s) => s.refreshTools);

  const [creating, setCreating] = useState(false);

  useEffect(() => { loadTools(); }, [loadTools]);

  if (!toolsLoadedOnce && toolsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Spinner size={28} label="Chargement des outils…" />
      </div>
    );
  }

  if (toolsError) {
    return (
      <div className="p-6">
        <ErrorBanner message={toolsError} onRetry={refreshTools} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-fv-text">Outils</h2>
        <Button variant="primary" onClick={() => setCreating(true)}>
          + Nouvel outil
        </Button>
      </div>

      {tools.length === 0 ? (
        <EmptyState
          title="Aucun outil"
          description="Créez votre premier outil pour organiser vos projets."
          action={<Button variant="primary" onClick={() => setCreating(true)}>+ Nouvel outil</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}

      {creating ? <ToolFormDialog onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
