export default function App() {
  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <div className="max-w-lg rounded-xl border border-fv-border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-fv-text">Test Tracker</h1>
        <p className="mt-2 text-fv-text-secondary">
          Suivi de cahiers de test markdown. Bootstrap Phase 1 — l&rsquo;UI sera
          branchée en Phase 4.
        </p>
        <div className="mt-4 rounded-md bg-fv-blue-light px-3 py-2 text-sm text-fv-text">
          Stack prête : Vite + React + Tailwind + Zustand + Recharts.
        </div>
      </div>
    </div>
  );
}
