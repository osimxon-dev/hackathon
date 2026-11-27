'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Shifokorlar', match: (p) => p === '/' || p.startsWith('/doctors') },
  { href: '/yonalishlar', label: "Yo'nalishlar", match: (p) => p.startsWith('/yonalishlar') },
  { href: '/chipta', label: 'Mening chiptam', match: (p) => p.startsWith('/chipta') },
  { href: '/qanday-ishlaydi', label: 'Qanday ishlaydi', match: (p) => p.startsWith('/qanday-ishlaydi') },
];

export default function SiteHeader() {
  const pathname = usePathname() || '/';
  return (
    <header className="site-header">
      <div className="wrap">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">N</span>
          Navbat
        </Link>
        <nav className="nav" aria-label="Asosiy menyu">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} aria-current={link.match(pathname) ? 'page' : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
