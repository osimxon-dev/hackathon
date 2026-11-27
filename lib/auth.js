// Registratura paneliga kirish: parol faqat ADMIN_PASSWORD muhit o'zgaruvchisida saqlanadi.
// Cookie'da parolning o'zi emas, uning SHA-256 xeshi turadi. Edge va Node'da bir xil ishlaydi.

export const ADMIN_COOKIE = 'navbat_admin';

export async function adminToken(password) {
  const bytes = new TextEncoder().encode(`navbat:${password}`);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function isAdmin(cookieValue) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !cookieValue) return false;
  return cookieValue === (await adminToken(password));
}
