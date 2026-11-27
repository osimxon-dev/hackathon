// Sana, vaqt va matnni formatlash (Toshkent vaqti).

export const CLINIC_TZ = 'Asia/Tashkent';

export const STATUS_LABELS = {
  scheduled: 'Kutilmoqda',
  completed: "Bo'ldi",
  cancelled: 'Bekor qilingan',
  no_show: 'Kelmadi',
};

export const WEEKDAYS_SHORT = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
const WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

export function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CLINIC_TZ }).format(new Date());
}

export function nowTime() {
  return new Intl.DateTimeFormat('en-GB', { timeZone: CLINIC_TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
}

export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 1 = dushanba ... 7 = yakshanba */
export function weekdayIndex(iso) {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function formatDate(iso, withWeekday = true) {
  const d = new Date(`${iso}T00:00:00Z`);
  const base = `${d.getUTCDate()}-${MONTHS[d.getUTCMonth()]}`;
  return withWeekday ? `${base}, ${WEEKDAYS[d.getUTCDay()]}` : base;
}

export function relativeDay(iso) {
  const today = todayISO();
  if (iso === today) return 'Bugun';
  if (iso === addDays(today, 1)) return 'Ertaga';
  return formatDate(iso);
}

export function formatPhone(phone) {
  const m = String(phone).match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

/** Kiritilayotgan raqamni +998 XX XXX XX XX ko'rinishiga keltiradi */
export function maskPhone(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean);
  return parts.length ? `+998 ${parts.join(' ')}` : '';
}

export const initials = (name) => String(name).split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
export const pad = (n) => String(n ?? 0).padStart(2, '0');

/** Qabul vaqti o'tganmi (Toshkent vaqti bo'yicha) */
export function isPast(date, time) {
  const today = todayISO();
  if (date !== today) return date < today;
  return time <= nowTime();
}
