import { useState } from 'react';
import { toolsApi } from '../../api/resources.js';
import { useStore } from '../../store/useStore.js';
import Button from '../shared/Button.jsx';
import ToolFormDialog from './ToolFormDialog.jsx';

export default function ToolCard({ tool }) {
  const refreshTools = useStore((s) => s.refreshTools);
  const refreshProjects = useStore((s) => s.refreshProjects);
  const showToast = useStore((s) => s.showToast);

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Supprimer l'outil "${tool.name}" ?`)) return;
    setDeleting(true);
    try {
      await toolsApi.delete(tool.id);
      await Promise.all([refreshTools(), refreshProjects()]);
      showToast('success', 'Outil supprimé.');
    } catch (e) {
      showToast('error', String(e.message || e));
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl border border-fv-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xl"
            style={{ backgroundColor: `${tool.color}22` }}
          >
            {tool.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: tool.color }}
              />
              <h3 className="truncate font-semibold text-fv-text">{tool.name}</h3>
            </div>
            <p className="mt-0.5 text-xs text-fv-text-secondary">
              {tool.project_count ?? 0} projet{tool.project_count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Modifier
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
            Supprimer
          </Button>
        </div>
      </div>

      {editing ? <ToolFormDialog tool={tool} onClose={() => setEditing(false)} /> : null}
    </>
  );
}
