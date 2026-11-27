import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminToken } from '@/lib/auth';

export async function POST(request) {
  const form = await request.formData();
  const password = String(form.get('password') || '');
  const next = String(form.get('next') || '/admin');
  const target = next.startsWith('/admin') ? next : '/admin';
  const back = (reason) => NextResponse.redirect(new URL(`/kirish?xato=${reason}&next=${encodeURIComponent(target)}`, request.url), 303);

  if (!process.env.ADMIN_PASSWORD) return back('sozlanmagan');
  if (password !== process.env.ADMIN_PASSWORD) return back('parol');

  const response = NextResponse.redirect(new URL(target, request.url), 303);
  response.cookies.set(ADMIN_COOKIE, await adminToken(password), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return response;
}
