import { useState } from 'react';
import { projectsApi } from '../../api/resources.js';
import { useStore } from '../../store/useStore.js';
import Button from '../shared/Button.jsx';
import ProjectFormDialog from './ProjectFormDialog.jsx';

export default function ProjectCard({ project }) {
  const refreshProjects = useStore((s) => s.refreshProjects);
  const showToast = useStore((s) => s.showToast);
  const setCurrentProject = useStore((s) => s.setCurrentProject);

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Supprimer le projet "${project.name}" ?`)) return;
    setDeleting(true);
    try {
      await projectsApi.delete(project.id);
      await refreshProjects();
      showToast('success', 'Projet supprimé.');
    } catch (e) {
      showToast('error', String(e.message || e));
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="group flex flex-col gap-3 rounded-xl border border-fv-border bg-white p-4 shadow-sm transition-shadow hover:border-fv-orange hover:shadow-md">
        <div
          className="h-1.5 w-full rounded-full"
          style={{ backgroundColor: project.color }}
        />

        <button
          type="button"
          onClick={() => setCurrentProject(project.id)}
          className="flex items-start gap-3 text-left focus:outline-none"
        >
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xl"
            style={{ backgroundColor: `${project.color}22` }}
          >
            {project.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-fv-text group-hover:text-fv-orange-dark">
              {project.name}
            </h3>
            {project.tool_name ? (
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="text-sm">{project.tool_icon}</span>
                <span className="truncate text-xs text-fv-text-secondary">{project.tool_name}</span>
              </div>
            ) : (
              <p className="text-xs text-fv-text-secondary">Sans outil</p>
            )}
            <p className="mt-1 text-xs text-fv-text-secondary">
              {project.plan_count ?? 0} plan{project.plan_count !== 1 ? 's' : ''}
            </p>
          </div>
        </button>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Modifier
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
            Supprimer
          </Button>
        </div>
      </div>

      {editing ? <ProjectFormDialog project={project} onClose={() => setEditing(false)} /> : null}
    </>
  );
}
