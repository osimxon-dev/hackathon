import Link from 'next/link';
import Logo from '@/components/Logo';
import SiteHeader from '@/components/SiteHeader';

// Bemor sayti: bosh sahifa, shifokorlar, yozilish, chipta.
export default function FrontendLayout({ children }) {
  return (
    <>
      <SiteHeader />
      <main>
        <div className="wrap">{children}</div>
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-top">
            <div className="footer-pitch">
              <span className="footer-logo"><Logo size={56} /><b>Navbat</b></span>
              <p>Poliklinikada shifokor qabuliga onlayn yozilish tizimi. Navbatda turmasdan, o&apos;zingizga qulay vaqtni tanlang</p>
              <Link className="btn btn-ticket" href="/shifokorlar">Qabulga yozilish <span aria-hidden="true">→</span></Link>
            </div>
            <div className="footer-cols">
              <nav aria-label="Bemorlar uchun">
                <b>Bemorlar uchun</b>
                <Link href="/shifokorlar">Shifokorlar</Link>
                <Link href="/yonalishlar">Yo&apos;nalishlar</Link>
                <Link href="/chipta">Mening chiptam</Link>
                <Link href="/qanday-ishlaydi">Qanday ishlaydi</Link>
              </nav>
              <nav aria-label="Ma'lumot">
                <b>Ma&apos;lumot</b>
                <Link href="/">Bosh sahifa</Link>
                <Link href="/#qanday">Qadamlar</Link>
                <Link href="/qanday-ishlaydi">Navbat qoidalari</Link>
              </nav>
              <div className="footer-info">
                <b>Qabul vaqti</b>
                <span>Vaqtlar Toshkent bo&apos;yicha (UTC+5)</span>
                <span>Yozilish 30 kun oldinga</span>
                <span>Bepul va ro&apos;yxatdan o&apos;tishsiz</span>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Navbat. Poliklinika uchun onlayn navbat tizimi</span>
            <span className="footer-stack">Next.js · PostgreSQL · MongoDB</span>
          </div>
        </div>
      </footer>
    </>
  );
}
