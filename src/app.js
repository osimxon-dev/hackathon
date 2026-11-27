import { HttpError, readJsonBody, sendJson } from './http.js';
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
 * Barcha /api/* so'rovlari uchun yagona kirish nuqtasi.
 * Lokal server ham, Vercel funksiyasi ham shu funksiyani chaqiradi.
 */
export async function handleApi(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const started = Date.now();

  try {
    const match = router.match(req.method, pathname);
    if (!match) throw new HttpError(404, `Bunday API manzili yo'q: ${req.method} ${pathname}`);
    if (match.allowed) {
      res.setHeader('Allow', match.allowed.join(', '));
      throw new HttpError(405, `${req.method} usuli bu manzil uchun ruxsat etilmagan`);
    }

    const body = METHODS_WITH_BODY.has(req.method) ? await readJsonBody(req) : undefined;
    const query = Object.fromEntries(
      [...url.searchParams.entries()].filter(([, value]) => value !== ''),
    );
    const result = await match.handler({ params: match.params, query, body });
    sendJson(res, result.status, result.body);
  } catch (err) {
    if (err instanceof HttpError) {
      sendJson(res, err.status, { error: err.message, ...(err.details && { details: err.details }) });
    } else {
      console.error(`[api] ${req.method} ${pathname}`, err);
      sendJson(res, 500, { error: 'Serverda kutilmagan xatolik yuz berdi. Birozdan so\'ng qayta urinib ko\'ring' });
    }
  } finally {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[api] ${req.method} ${pathname} ${res.statusCode} ${Date.now() - started}ms`);
    }
  }
}
