/**
 * HTTP yordamchilari: xatolar va so'rov tanasini tekshirish.
 * Framework'ga bog'liq emas — Next.js route handler ham, testlar ham ishlatadi.
 */

export class HttpError extends Error {
  /**
   * @param {number} status HTTP status kodi
   * @param {string} message Foydalanuvchiga tushunarli xabar
   * @param {Record<string, string>} [details] Maydonlar bo'yicha xatolar
   */
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const notFound = (message = 'Topilmadi') => new HttpError(404, message);
export const conflict = (message) => new HttpError(409, message);
export const unprocessable = (message, details) => new HttpError(422, message, details);

const MAX_BODY_BYTES = 100 * 1024;

/**
 * Xom so'rov tanasini JSON sifatida tekshiradi. Bo'sh tana -> {}.
 * @param {string} raw
 * @param {string | null} contentType
 */
export function parseJsonBody(raw, contentType) {
  if (!raw || !raw.trim()) return {};
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    throw new HttpError(413, "So'rov hajmi juda katta (maksimum 100 KB)");
  }
  if (!(contentType || '').includes('application/json')) {
    throw new HttpError(415, "Content-Type 'application/json' bo'lishi kerak");
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw badRequest("So'rov tanasi yaroqli JSON emas");
  }
}
