import { useState } from 'react';
import { toolsApi } from '../../api/resources.js';
import { useStore } from '../../store/useStore.js';
import { COLOR_PALETTE, ICON_SUGGESTIONS } from '../../lib/palette.js';
import Button from '../shared/Button.jsx';
import Modal from '../shared/Modal.jsx';
import ColorIconPicker from '../shared/ColorIconPicker.jsx';

export default function ToolFormDialog({ tool = null, onClose }) {
  const refreshTools = useStore((s) => s.refreshTools);
  const showToast = useStore((s) => s.showToast);

  const [name, setName] = useState(tool?.name ?? '');
  const [color, setColor] = useState(tool?.color ?? COLOR_PALETTE[0].value);
  const [icon, setIcon] = useState(tool?.icon ?? ICON_SUGGESTIONS[0]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setErr('Le nom est requis.'); return; }
    setSaving(true);
    setErr(null);
    try {
      if (tool) {
        await toolsApi.update(tool.id, { name: name.trim(), color, icon });
        showToast('success', 'Outil mis à jour.');
      } else {
        await toolsApi.create({ name: name.trim(), color, icon });
        showToast('success', 'Outil créé.');
      }
      await refreshTools();
      onClose();
    } catch (e) {
      setErr(String(e.message || e));
      setSaving(false);
    }
  }

  const title = tool ? 'Modifier l\'outil' : 'Nouvel outil';

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
            placeholder="Ex: Divalto, Salesforce…"
            className="w-full rounded-md border border-fv-border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-fv-orange"
            autoFocus
          />
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
