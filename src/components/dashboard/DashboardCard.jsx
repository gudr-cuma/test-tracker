/**
 * Shared card frame for dashboard tiles. Title + optional subtitle + body.
 * `className` lets the caller override min-height when a chart needs more room.
 */
export default function DashboardCard({ title, subtitle, children, className = '' }) {
  return (
    <section
      className={`flex flex-col rounded-md border border-fv-border bg-white p-4 ${className}`}
    >
      <header className="mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-fv-text-secondary">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-fv-text-secondary">{subtitle}</p>
        ) : null}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
