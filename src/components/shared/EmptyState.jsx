export default function EmptyState({ title, description, action = null }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-fv-border bg-white px-6 py-12 text-center">
      <h3 className="text-lg font-semibold text-fv-text">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-fv-text-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
