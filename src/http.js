/**
 * HTTP yordamchilari: xatolar, JSON javob, so'rov tanasini o'qish.
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

export function sendJson(res, status, payload) {
  if (status === 204) {
    res.statusCode = 204;
    res.end();
    return;
  }
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}

/** So'rov tanasini JSON sifatida o'qiydi. Bo'sh tana -> {}. */
export async function readJsonBody(req) {
  // Ba'zi platformalar (Vercel) tanani oldindan o'qib qo'yadi
  if (req.body !== undefined && req.body !== null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  const contentType = req.headers['content-type'] || '';
  let raw = '';
  if (typeof req.body === 'string') raw = req.body;
  else if (Buffer.isBuffer(req.body)) raw = req.body.toString('utf8');
  else {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) throw new HttpError(413, "So'rov hajmi juda katta (maksimum 100 KB)");
      chunks.push(chunk);
    }
    raw = Buffer.concat(chunks).toString('utf8');
  }

  if (!raw.trim()) return {};
  if (!contentType.includes('application/json')) {
    throw new HttpError(415, "Content-Type 'application/json' bo'lishi kerak");
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw badRequest("So'rov tanasi yaroqli JSON emas");
  }
}
