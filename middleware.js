import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, isAdmin } from '@/lib/auth';

// Registratura paneli va shifokorlarni o'zgartiruvchi API faqat kirgan xodim uchun.
export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const ok = await isAdmin(request.cookies.get(ADMIN_COOKIE)?.value);
  if (ok) return NextResponse.next();

  if (pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone();
    url.pathname = '/kirish';
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  const writesDoctors = pathname.startsWith('/api/doctors') && method !== 'GET';
  const deletesAppointment = pathname.startsWith('/api/appointments/') && method === 'DELETE';
  const readsActivity = pathname.startsWith('/api/activity');
  if (writesDoctors || deletesAppointment || readsActivity) {
    return NextResponse.json({ error: 'Bu amal uchun registratura paneliga kiring' }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/doctors/:path*', '/api/doctors', '/api/appointments/:path*', '/api/activity'],
};
