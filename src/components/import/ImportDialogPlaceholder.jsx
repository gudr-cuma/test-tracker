import { useStore } from '../../store/useStore.js';
import Button from '../shared/Button.jsx';

/**
 * Temporary placeholder shown when `dialog.type === 'import'`.
 * Will be replaced by the real import dialog (dropzone + diff preview + apply)
 * in lot 4b.
 */
export default function ImportDialogPlaceholder() {
  const closeDialog = useStore((s) => s.closeDialog);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-dialog-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeDialog();
      }}
    >
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 id="import-dialog-title" className="text-lg font-semibold text-fv-text">
          Importer un cahier
        </h2>
        <p className="mt-2 text-sm text-fv-text-secondary">
          Le dialog d&rsquo;import (dropzone + preview des différences + application)
          arrivera au prochain lot. Les endpoints backend sont déjà prêts
          (<code className="text-xs">POST /api/plans/import/dry-run</code> et{' '}
          <code className="text-xs">/apply</code>).
        </p>
        <div className="mt-5 flex justify-end">
          <Button onClick={closeDialog}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}
