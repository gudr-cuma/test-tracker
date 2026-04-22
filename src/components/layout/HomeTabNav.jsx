import { useStore } from '../../store/useStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';

const HOME_TABS = [
  { id: 'outils',  label: 'Outils' },
  { id: 'projets', label: 'Projets' },
  { id: 'plans',   label: 'Plans de test' },
];

export default function HomeTabNav() {
  const homeTab = useStore((s) => s.homeTab);
  const setHomeTab = useStore((s) => s.setHomeTab);
  const user = useAuthStore((s) => s.user);

  const tabs = user?.is_admin
    ? [...HOME_TABS, { id: 'admin', label: 'Admin' }]
    : HOME_TABS;

  return (
    <nav className="border-b border-fv-border bg-white px-6">
      <ul className="flex gap-1">
        {tabs.map((t) => {
          const active = t.id === homeTab;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setHomeTab(t.id)}
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
