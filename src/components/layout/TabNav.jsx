import { useStore } from '../../store/useStore.js';

const TABS = [
  { id: 'cases', label: 'Cas de test' },
  { id: 'dashboard', label: 'Tableau de bord' },
];

export default function TabNav() {
  const currentTab = useStore((s) => s.currentTab);
  const setTab = useStore((s) => s.setTab);

  return (
    <nav className="border-b border-fv-border bg-white px-6">
      <ul className="flex gap-1">
        {TABS.map((t) => {
          const active = t.id === currentTab;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  'border-b-2 px-3 py-2.5 text-sm font-medium transition',
                  active
                    ? 'border-fv-orange text-fv-text'
                    : 'border-transparent text-fv-text-secondary hover:text-fv-text',
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
              >
                {t.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
