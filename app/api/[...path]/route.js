// Next.js route handler: barcha /api/* so'rovlarini backend dispetcheriga uzatadi.
import { dispatch } from '@/backend/app';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(request) {
  const result = await dispatch({
    method: request.method,
    url: request.url,
    contentType: request.headers.get('content-type'),
    readBody: () => request.text(),
  });

  const headers = { 'Cache-Control': 'no-store', ...(result.headers || {}) };
  if (result.status === 204) {
    return new Response(null, { status: 204, headers });
  }
  return Response.json(result.body, { status: result.status, headers });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
