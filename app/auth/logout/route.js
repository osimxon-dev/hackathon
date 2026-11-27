import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/auth';

export async function GET(request) {
  const response = NextResponse.redirect(new URL('/kirish', request.url), 303);
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}
