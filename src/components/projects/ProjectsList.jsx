import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore.js';
import Button from '../shared/Button.jsx';
import Spinner from '../shared/Spinner.jsx';
import ErrorBanner from '../shared/ErrorBanner.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import ProjectCard from './ProjectCard.jsx';
import ProjectFormDialog from './ProjectFormDialog.jsx';

export default function ProjectsList() {
  const projects = useStore((s) => s.projects);
  const projectsLoading = useStore((s) => s.projectsLoading);
  const projectsError = useStore((s) => s.projectsError);
  const projectsLoadedOnce = useStore((s) => s.projectsLoadedOnce);
  const loadProjects = useStore((s) => s.loadProjects);
  const loadTools = useStore((s) => s.loadTools);
  const refreshProjects = useStore((s) => s.refreshProjects);

  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
    loadTools();
  }, [loadProjects, loadTools]);

  if (!projectsLoadedOnce && projectsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Spinner size={28} label="Chargement des projets…" />
      </div>
    );
  }

  if (projectsError) {
    return (
      <div className="p-6">
        <ErrorBanner message={projectsError} onRetry={refreshProjects} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-fv-text">Projets</h2>
        <Button variant="primary" onClick={() => setCreating(true)}>
          + Nouveau projet
        </Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="Aucun projet"
          description="Créez un projet pour regrouper vos plans de test."
          action={<Button variant="primary" onClick={() => setCreating(true)}>+ Nouveau projet</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {creating ? <ProjectFormDialog onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
