import { HttpError, parseJsonBody } from './http.js';
import { Router } from './router.js';
import { registerAppointmentRoutes } from './routes/appointments.js';
import { registerDoctorRoutes } from './routes/doctors.js';
import { registerStatsRoutes } from './routes/stats.js';

const router = new Router();
registerDoctorRoutes(router);
registerAppointmentRoutes(router);
registerStatsRoutes(router);

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

/**
 * Barcha /api/* so'rovlari uchun yagona kirish nuqtasi (framework'dan mustaqil).
 * Next.js route handler va avtotestlar shu funksiyani chaqiradi.
 *
 * @param {{ method: string, url: string, contentType?: string | null, readBody?: () => Promise<string> }} request
 * @returns {Promise<{ status: number, body?: unknown, headers?: Record<string, string> }>}
 */
export async function dispatch({ method, url, contentType = null, readBody = async () => '' }) {
  const parsed = new URL(url, 'http://localhost');
  const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
  const started = Date.now();
  let result;

  try {
    const match = router.match(method, pathname);
    if (!match) throw new HttpError(404, `Bunday API manzili yo'q: ${method} ${pathname}`);
    if (match.allowed) {
      const error = new HttpError(405, `${method} usuli bu manzil uchun ruxsat etilmagan`);
      error.headers = { Allow: match.allowed.join(', ') };
      throw error;
    }

    const body = METHODS_WITH_BODY.has(method) ? parseJsonBody(await readBody(), contentType) : undefined;
    const query = Object.fromEntries([...parsed.searchParams.entries()].filter(([, value]) => value !== ''));
    result = await match.handler({ params: match.params, query, body });
  } catch (err) {
    if (err instanceof HttpError) {
      result = {
        status: err.status,
        body: { error: err.message, ...(err.details && { details: err.details }) },
        headers: err.headers,
      };
    } else {
      console.error(`[api] ${method} ${pathname}`, err);
      result = { status: 500, body: { error: 'Serverda kutilmagan xatolik yuz berdi. Birozdan so\'ng qayta urinib ko\'ring' } };
    }
  }

  if (process.env.NODE_ENV !== 'test') {
    console.log(`[api] ${method} ${pathname} ${result.status} ${Date.now() - started}ms`);
  }
  return result;
}
