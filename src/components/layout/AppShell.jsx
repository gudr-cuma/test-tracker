import AppHeader from './AppHeader.jsx';
import Toast from '../shared/Toast.jsx';

export default function AppShell({ children }) {
  return (
    <div className="flex min-h-full flex-col">
      <AppHeader />
      <main className="flex-1">{children}</main>
      <Toast />
    </div>
  );
}
