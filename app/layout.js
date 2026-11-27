import { ToastProvider } from '@/components/Toast';
import './globals.css';

// Root layout: faqat umumiy qobiq. Bemor sayti — app/(frontend), registratura paneli — app/(admin).
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
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
