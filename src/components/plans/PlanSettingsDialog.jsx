import { useEffect, useState } from 'react';
import { plansApi } from '../../api/resources.js';
import { useStore } from '../../store/useStore.js';
import { COLOR_PALETTE, ICON_SUGGESTIONS } from '../../lib/palette.js';
import Button from '../shared/Button.jsx';
import Modal from '../shared/Modal.jsx';
import ColorIconPicker from '../shared/ColorIconPicker.jsx';

export default function PlanSettingsDialog({ plan, onClose }) {
  const projects = useStore((s) => s.projects);
  const projectsLoadedOnce = useStore((s) => s.projectsLoadedOnce);
  const loadProjects = useStore((s) => s.loadProjects);
  const refreshPlans = useStore((s) => s.refreshPlans);
  const showToast = useStore((s) => s.showToast);

  const [title, setTitle] = useState(plan.title ?? '');
  const [projectId, setProjectId] = useState(plan.project_id ?? '');
  const [color, setColor] = useState(plan.color ?? COLOR_PALETTE[0].value);
  const [icon, setIcon] = useState(plan.icon ?? ICON_SUGGESTIONS[3]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setErr('Le titre est requis.'); return; }
    setSaving(true);
    setErr(null);
    try {
      await plansApi.update(plan.id, {
        title: title.trim(),
        project_id: projectId || null,
        color: color || null,
        icon: icon || null,
      });
      await refreshPlans();
      showToast('success', 'Plan mis à jour.');
      onClose();
    } catch (e) {
      setErr(String(e.message || e));
      setSaving(false);
    }
  }

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={saving}>Annuler</Button>
      <Button variant="primary" onClick={handleSubmit} disabled={saving}>
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </>
  );

  return (
    <Modal title="Paramètres du plan" onClose={onClose} size="md" dismissible={!saving} footer={footer}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {err ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p> : null}

        <div>
          <label className="mb-1 block text-sm font-medium text-fv-text">Titre</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-fv-border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-fv-orange"
            autoFocus
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-fv-text">Projet (optionnel)</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-md border border-fv-border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-fv-orange"
          >
            <option value="">— Aucun projet —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.icon} {p.name}
                {p.tool_name ? ` (${p.tool_name})` : ''}
              </option>
            ))}
          </select>
        </div>

        <ColorIconPicker
          color={color}
          icon={icon}
          onColorChange={setColor}
          onIconChange={setIcon}
        />
      </form>
    </Modal>
  );
}
