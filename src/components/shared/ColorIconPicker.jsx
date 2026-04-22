import { useState } from 'react';
import { COLOR_PALETTE, ICON_SUGGESTIONS } from '../../lib/palette.js';
import clsx from 'clsx';

export default function ColorIconPicker({ color, icon, onColorChange, onIconChange }) {
  const [customIcon, setCustomIcon] = useState('');

  function handleCustomIcon(e) {
    const val = e.target.value;
    setCustomIcon(val);
    if (val.trim()) onIconChange(val.trim());
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs font-medium text-fv-text-secondary">Couleur</p>
        <div className="flex flex-wrap gap-2">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => onColorChange(c.value)}
              className={clsx(
                'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                color === c.value ? 'border-fv-text scale-110' : 'border-transparent',
              )}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-fv-text-secondary">Icône</p>
        <div className="flex flex-wrap gap-1.5">
          {ICON_SUGGESTIONS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => { onIconChange(em); setCustomIcon(''); }}
              className={clsx(
                'flex h-8 w-8 items-center justify-center rounded-md border text-lg transition-colors focus:outline-none focus-visible:ring-2',
                icon === em
                  ? 'border-fv-orange bg-fv-orange/10'
                  : 'border-fv-border bg-white hover:bg-fv-bg-secondary',
              )}
            >
              {em}
            </button>
          ))}
        </div>
        <input
          type="text"
          maxLength={2}
          placeholder="Emoji personnalisé…"
          value={customIcon}
          onChange={handleCustomIcon}
          className="mt-2 w-40 rounded-md border border-fv-border px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-fv-orange"
        />
      </div>
    </div>
  );
}
