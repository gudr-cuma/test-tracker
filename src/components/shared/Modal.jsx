import { useEffect, useRef } from 'react';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/**
 * Reusable modal. Closes on Esc and on backdrop click (unless `dismissible`
 * is false). Focus lands on the first focusable child by default.
 */
export default function Modal({
  title,
  onClose,
  size = 'md',
  dismissible = true,
  footer = null,
  children,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && dismissible) onClose();
    }
    document.addEventListener('keydown', onKey);
    // Focus the dialog container so Esc listener captures even without focused input
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, dismissible]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={`flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-lg bg-white shadow-xl outline-none ${SIZES[size] || SIZES.md}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-fv-border px-5 py-3">
          <h2 id="modal-title" className="text-lg font-semibold text-fv-text">
            {title}
          </h2>
          {dismissible ? (
            <button
              type="button"
              aria-label="Fermer"
              onClick={onClose}
              className="-mr-1 rounded p-1 text-fv-text-secondary hover:bg-fv-bg-secondary hover:text-fv-text focus:outline-none focus-visible:ring-2 focus-visible:ring-fv-blue"
            >
              <span aria-hidden="true" className="text-xl leading-none">×</span>
            </button>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-fv-border bg-fv-bg-secondary px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
