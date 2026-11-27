/**
 * Navbat (qabul) biznes qoidalari. Barcha qoidalar shu yerda, bitta joyda.
 *
 *  1. Faol bo'lmagan shifokorga yozilib bo'lmaydi.
 *  2. O'tgan sana/vaqtga yozilib bo'lmaydi; 30 kundan uzoq oldinga ham yozilmaydi.
 *  3. Faqat shifokorning ish kunlari va ish soatlari ichida, qabul qadamiga mos vaqtga.
 *  4. Bitta shifokorning bitta vaqtiga faqat bitta faol qabul (DB indeks bilan ham himoyalangan).
 *  5. Bemor bir vaqtning o'zida ikki joyda bo'la olmaydi.
 *  6. Bemor bitta shifokorga bir kunda faqat bir marta yoziladi.
 *  7. Holatlar: scheduled -> completed | cancelled | no_show. Yakuniy holat o'zgarmaydi.
 *     "Bo'ldi" va "Kelmadi" faqat qabul vaqti kelganidan keyin belgilanadi.
 *  8. Bo'lib o'tgan (completed) qabul — tibbiy tarix, uni o'chirib bo'lmaydi.
 */
import { one, query, PG } from '../db.js';
import { conflict, notFound, unprocessable } from '../http.js';
import { toDoctor } from '../mappers.js';
import { BOOKING_WINDOW_DAYS, clinicNow, daysBetween, fitsSchedule, isoWeekday, toMinutes } from '../time.js';

const WEEKDAY_NAMES = ['', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba', 'yakshanba'];

export const STATUS_TRANSITIONS = {
  scheduled: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export const STATUS_LABELS = {
  scheduled: 'Kutilmoqda',
  completed: "Bo'ldi",
  cancelled: 'Bekor qilingan',
  no_show: 'Kelmadi',
};

export async function getDoctorOrFail(doctorId) {
  const doctor = toDoctor(await one('SELECT * FROM doctors WHERE id = $1', [doctorId]));
  if (!doctor) throw notFound('Shifokor topilmadi');
  return doctor;
}

/** Sana/vaqt kelajakdami (Toshkent vaqti bo'yicha) */
export function isInFuture(dateStr, time, now = clinicNow()) {
  if (dateStr !== now.date) return dateStr > now.date;
  return toMinutes(time) > now.minutes;
}

/** Vaqt shifokor jadvaliga va umumiy qoidalarga mosligini tekshiradi (2- va 3-qoida). */
export function assertBookableTime(doctor, dateStr, time, now = clinicNow()) {
  if (!doctor.isActive) {
    throw unprocessable('Bu shifokor hozircha qabul qilmaydi');
  }
  if (!isInFuture(dateStr, time, now)) {
    throw unprocessable("O'tib ketgan vaqtga yozilib bo'lmaydi", { startTime: 'Kelajakdagi vaqtni tanlang' });
  }
  if (daysBetween(now.date, dateStr) > BOOKING_WINDOW_DAYS) {
    throw unprocessable(`Ko'pi bilan ${BOOKING_WINDOW_DAYS} kun oldinga yozilish mumkin`, { appointmentDate: 'Yaqinroq sanani tanlang' });
  }
  const weekday = isoWeekday(dateStr);
  if (!doctor.workDays.includes(weekday)) {
    throw unprocessable(`Shifokor ${WEEKDAY_NAMES[weekday]} kuni ishlamaydi`, { appointmentDate: 'Shifokorning ish kunini tanlang' });
  }
  if (!fitsSchedule(doctor, time)) {
    throw unprocessable(
      `Vaqt shifokor jadvaliga mos emas: ${doctor.workStart}–${doctor.workEnd}, har ${doctor.slotMinutes} daqiqada`,
      { startTime: 'Jadvaldagi bo\'sh vaqtlardan birini tanlang' },
    );
  }
}

/** Band vaqt va bemor bo'yicha to'qnashuvlarni tekshiradi (4–6-qoida). */
export async function assertNoConflicts({ doctorId, appointmentDate, startTime, patientPhone }, excludeId = 0) {
  const taken = await one(
    `SELECT id FROM appointments
     WHERE doctor_id = $1 AND appointment_date = $2 AND start_time = $3
       AND status IN ('scheduled', 'completed') AND id <> $4`,
    [doctorId, appointmentDate, startTime, excludeId],
  );
  if (taken) throw conflict('Bu vaqt band. Boshqa bo\'sh vaqtni tanlang');

  const busyPatient = await one(
    `SELECT a.id, d.full_name FROM appointments a JOIN doctors d ON d.id = a.doctor_id
     WHERE a.patient_phone = $1 AND a.appointment_date = $2 AND a.start_time = $3
       AND a.status = 'scheduled' AND a.id <> $4`,
    [patientPhone, appointmentDate, startTime, excludeId],
  );
  if (busyPatient) throw conflict(`Bu bemor shu vaqtda ${busyPatient.full_name} qabulida bo'ladi`);

  const sameDay = await one(
    `SELECT id FROM appointments
     WHERE patient_phone = $1 AND doctor_id = $2 AND appointment_date = $3
       AND status = 'scheduled' AND id <> $4`,
    [patientPhone, doctorId, appointmentDate, excludeId],
  );
  if (sameDay) throw conflict('Bemor bu shifokorga shu kunga allaqachon yozilgan');
}

/** Holat o'tishini tekshiradi (7-qoida). */
export function assertStatusTransition(current, next, appointment, now = clinicNow()) {
  if (current === next) return;
  if (!STATUS_TRANSITIONS[current].includes(next)) {
    throw conflict(`"${STATUS_LABELS[current]}" holatidagi qabulni "${STATUS_LABELS[next]}" holatiga o'tkazib bo'lmaydi`);
  }
  if ((next === 'completed' || next === 'no_show') && isInFuture(appointment.appointmentDate, appointment.startTime, now)) {
    throw unprocessable('Qabul vaqti hali kelmagan: uni "bo\'ldi" yoki "kelmadi" deb belgilab bo\'lmaydi');
  }
}

/** DB darajasidagi unique xatolarni tushunarli 409 ga aylantiradi (poyga holati). */
export function mapDbConflict(err) {
  if (err?.code === PG.UNIQUE_VIOLATION) {
    if (err.constraint === 'uniq_patient_slot') return conflict('Bu bemor shu vaqtda boshqa qabulda bo\'ladi');
    return conflict('Bu vaqt hozirgina band qilindi. Boshqa vaqtni tanlang');
  }
  if (err?.code === PG.FOREIGN_KEY_VIOLATION) return notFound('Shifokor topilmadi');
  return err;
}

/** Shifokor jadvali o'zgarsa, kelajakdagi qabullar yangi jadvalga sig'ishini tekshiradi. */
export async function assertScheduleChangeSafe(doctor) {
  const now = clinicNow();
  const { rows } = await query(
    `SELECT appointment_date, start_time FROM appointments
     WHERE doctor_id = $1 AND status = 'scheduled' AND appointment_date >= $2`,
    [doctor.id, now.date],
  );
  const broken = rows.filter((r) => {
    const time = String(r.start_time).slice(0, 5);
    return !doctor.workDays.includes(isoWeekday(r.appointment_date)) || !fitsSchedule(doctor, time);
  });
  if (broken.length > 0) {
    throw conflict(`Yangi jadvalga ${broken.length} ta rejalashtirilgan qabul sig'maydi. Avval ularni ko'chiring yoki bekor qiling`);
  }
}
