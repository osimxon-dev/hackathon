'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: "Umumiy ko'rinish", icon: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z', exact: true },
  { href: '/admin/qabullar', label: 'Qabullar', icon: 'M8 3v3M16 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z' },
  { href: '/admin/shifokorlar', label: 'Shifokorlar', icon: 'M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6' },
  { href: '/admin/tablo', label: 'Navbat tablosi', icon: 'M3 5h18v11H3zM8 20h8M12 16v4' },
];

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function AdminShell({ children }) {
  const pathname = usePathname() || '/admin';
  const active = (l) => (l.exact ? pathname === l.href : pathname.startsWith(l.href));
  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link className="brand" href="/admin">
          <span className="brand-mark" aria-hidden="true">N</span>
          Navbat
        </Link>
        <span className="admin-role">Registratura paneli</span>
        <nav className="admin-nav" aria-label="Panel menyusi">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={active(l) ? 'page' : undefined}>
              <Icon d={l.icon} />
              {l.label}
            </Link>
          ))}
        </nav>
        <Link className="admin-exit" href="/">
          <Icon d="M15 18l-6-6 6-6" />
          Bemor sayti
        </Link>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
