'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Bosh sahifa', match: (p) => p === '/' },
  { href: '/shifokorlar', label: 'Shifokorlar', match: (p) => p.startsWith('/shifokorlar') || p.startsWith('/doctors') },
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
          <Logo size={40} />
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
