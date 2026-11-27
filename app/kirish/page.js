import Link from 'next/link';

export const metadata = { title: 'Registraturaga kirish' };

const ERRORS = {
  parol: "Parol noto'g'ri",
  sozlanmagan: "Serverda ADMIN_PASSWORD o'rnatilmagan. Uni .env yoki Vercel sozlamalariga qo'shing",
};

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const error = ERRORS[params?.xato];
  const next = typeof params?.next === 'string' && params.next.startsWith('/admin') ? params.next : '/admin';
  return (
    <main className="login">
      <form className="login-card" method="post" action="/auth/login">
        <span className="brand login-brand"><span className="brand-mark" aria-hidden="true">N</span>Navbat</span>
        <div>
          <h1>Registratura paneli</h1>
          <p className="muted">Faqat poliklinika xodimlari uchun</p>
        </div>
        <input type="hidden" name="next" value={next} />
        <div className="field">
          <label htmlFor="password">Parol</label>
          <input id="password" name="password" type="password" className="input" autoComplete="current-password" required autoFocus aria-invalid={error ? 'true' : undefined} />
          {error && <span className="error-text" role="alert">{error}</span>}
        </div>
        <button className="btn btn-ticket" type="submit">Kirish</button>
        <Link className="login-back" href="/">Bemor saytiga qaytish</Link>
      </form>
    </main>
  );
}
