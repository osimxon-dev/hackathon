import AdminShell from '@/components/AdminShell';

export const metadata = {
  title: { default: 'Registratura paneli — Navbat', template: '%s — Registratura' },
};

// Registratura paneli: alohida qobiq va yon menyu.
export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
