import SiteHeader from '@/components/SiteHeader';
import { ToastProvider } from '@/components/Toast';
import './globals.css';

export const metadata = {
  title: {
    default: 'Navbat — shifokor qabuliga onlayn yozilish',
    template: '%s — Navbat',
  },
  description: "Poliklinikada navbatda turmasdan shifokor qabuliga yoziling: bo'sh vaqtlarni ko'ring va chiptangizni oling.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#10343a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=Unbounded:wght@500;600;700&display=swap"
        />
      </head>
      <body>
        <ToastProvider>
          <SiteHeader />
          <main>
            <div className="wrap">{children}</div>
          </main>
          <footer className="site-footer">
            <div className="wrap">
              Navbat — poliklinika uchun onlayn navbat tizimi. Vaqtlar Toshkent vaqti bo&apos;yicha.
            </div>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
