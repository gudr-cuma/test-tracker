export default function ErrorBanner({ message, onRetry = null }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-fv-red/40 bg-red-50 px-4 py-3 text-sm text-fv-red">
      <span aria-hidden="true" className="mt-0.5 font-bold">!</span>
      <div className="flex-1">
        <div className="font-medium">Erreur</div>
        <div className="mt-0.5">{message}</div>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded border border-fv-red/40 px-2 py-1 text-xs font-medium hover:bg-white"
        >
          Réessayer
        </button>
      ) : null}
    </div>
  );
}
