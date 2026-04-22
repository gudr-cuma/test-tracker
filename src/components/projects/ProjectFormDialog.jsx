import { useState } from 'react';
import { projectsApi } from '../../api/resources.js';
import { useStore } from '../../store/useStore.js';
import { COLOR_PALETTE, ICON_SUGGESTIONS } from '../../lib/palette.js';
import Button from '../shared/Button.jsx';
import Modal from '../shared/Modal.jsx';
import ColorIconPicker from '../shared/ColorIconPicker.jsx';

export default function ProjectFormDialog({ project = null, onClose }) {
  const tools = useStore((s) => s.tools);
  const refreshProjects = useStore((s) => s.refreshProjects);
  const showToast = useStore((s) => s.showToast);

  const [name, setName] = useState(project?.name ?? '');
  const [toolId, setToolId] = useState(project?.tool_id ?? '');
  const [color, setColor] = useState(project?.color ?? COLOR_PALETTE[1].value);
  const [icon, setIcon] = useState(project?.icon ?? ICON_SUGGESTIONS[2]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setErr('Le nom est requis.'); return; }
    setSaving(true);
    setErr(null);
    try {
      const payload = { name: name.trim(), tool_id: toolId || null, color, icon };
      if (project) {
        await projectsApi.update(project.id, payload);
        showToast('success', 'Projet mis à jour.');
      } else {
        await projectsApi.create(payload);
        showToast('success', 'Projet créé.');
      }
      await refreshProjects();
      onClose();
    } catch (e) {
      setErr(String(e.message || e));
      setSaving(false);
    }
  }

  const title = project ? 'Modifier le projet' : 'Nouveau projet';

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={saving}>Annuler</Button>
      <Button variant="primary" onClick={handleSubmit} disabled={saving}>
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </>
  );

  return (
    <Modal title={title} onClose={onClose} size="md" dismissible={!saving} footer={footer}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {err ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p> : null}

        <div>
          <label className="mb-1 block text-sm font-medium text-fv-text">Nom</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: CRM, ERP, Site web…"
            className="w-full rounded-md border border-fv-border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-fv-orange"
            autoFocus
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-fv-text">Outil (optionnel)</label>
          <select
            value={toolId}
            onChange={(e) => setToolId(e.target.value)}
            className="w-full rounded-md border border-fv-border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-fv-orange"
          >
            <option value="">— Aucun outil —</option>
            {tools.map((t) => (
              <option key={t.id} value={t.id}>
                {t.icon} {t.name}
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

        <div className="flex items-center gap-3 rounded-md border border-fv-border bg-fv-bg-secondary px-3 py-2">
          <span className="text-2xl">{icon}</span>
          <span className="font-medium text-fv-text">{name || 'Aperçu'}</span>
          <span
            className="ml-auto h-4 w-4 rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
      </form>
    </Modal>
  );
}
