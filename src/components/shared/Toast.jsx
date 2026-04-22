import { useEffect } from 'react';
import { useStore } from '../../store/useStore.js';

const KIND_STYLES = {
  success: 'border-fv-green-dark bg-fv-green-light text-fv-text',
  error: 'border-fv-red bg-red-50 text-fv-red',
  info: 'border-fv-blue bg-fv-blue-light text-fv-text',
};

export default function Toast() {
  const toast = useStore((s) => s.toast);
  const clearToast = useStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => clearToast(), 4000);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  if (!toast) return null;

  const cls = KIND_STYLES[toast.kind] || KIND_STYLES.info;
  return (
    <div
      role="status"
      className={`pointer-events-auto fixed bottom-4 right-4 z-50 max-w-sm rounded-md border px-4 py-3 text-sm shadow-lg ${cls}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex-1">{toast.message}</span>
        <button
          type="button"
          aria-label="Fermer"
          className="text-fv-text-secondary hover:text-fv-text"
          onClick={clearToast}
        >
          ×
        </button>
      </div>
    </div>
  );
}
