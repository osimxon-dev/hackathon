import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';

// Bemor sayti: shifokor tanlash, yozilish, chipta.
export default function FrontendLayout({ children }) {
  return (
    <>
      <SiteHeader />
      <main>
        <div className="wrap">{children}</div>
      </main>
      <footer className="site-footer">
        <div className="wrap footer-grid">
          <div>
            <b className="footer-brand">Navbat</b>
            <p>Poliklinika uchun onlayn navbat tizimi. Vaqtlar Toshkent vaqti bo&apos;yicha</p>
          </div>
          <nav aria-label="Bemorlar uchun">
            <b>Bemorlar uchun</b>
            <Link href="/">Shifokorlar</Link>
            <Link href="/yonalishlar">Yo&apos;nalishlar</Link>
            <Link href="/chipta">Mening chiptam</Link>
            <Link href="/qanday-ishlaydi">Qanday ishlaydi</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
