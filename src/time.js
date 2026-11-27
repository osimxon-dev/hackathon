/**
 * Vaqt bilan ishlash. Klinika Toshkent vaqtida ishlaydi (UTC+5),
 * server esa istalgan zonada bo'lishi mumkin (Vercel — UTC).
 */
export const CLINIC_TZ = 'Asia/Tashkent';
export const BOOKING_WINDOW_DAYS = 30;

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLINIC_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** @returns {{ date: string, minutes: number }} Toshkentdagi joriy sana va daqiqa */
export function clinicNow(now = new Date()) {
  const p = Object.fromEntries(formatter.formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

/** "09:30" yoki "09:30:00" -> 570 */
export function toMinutes(time) {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + m;
}

/** 570 -> "09:30" */
export function fromMinutes(total) {
  const h = String(Math.floor(total / 60)).padStart(2, '0');
  const m = String(total % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/** "HH:MM:SS" -> "HH:MM" */
export const shortTime = (time) => (time ? String(time).slice(0, 5) : time);

export function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** ISO hafta kuni: 1 = dushanba ... 7 = yakshanba */
export function isoWeekday(dateStr) {
  const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function daysBetween(fromDate, toDate) {
  return Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86400000);
}

/** Shifokorning bir kunlik barcha qabul vaqtlari (daqiqalarda) */
export function slotStarts(doctor) {
  const start = toMinutes(doctor.workStart);
  const end = toMinutes(doctor.workEnd);
  const step = doctor.slotMinutes;
  const result = [];
  for (let t = start; t + step <= end; t += step) result.push(t);
  return result;
}

/** Vaqt shifokor jadvaliga to'g'ri keladimi (ish soati ichida va qadamga mos) */
export function fitsSchedule(doctor, time) {
  return slotStarts(doctor).includes(toMinutes(time));
}

/** Navbat chiptasi raqami: kunning nechanchi qabuli ekani */
export function ticketNumber(doctor, time) {
  const index = slotStarts(doctor).indexOf(toMinutes(time));
  return index === -1 ? null : index + 1;
}
