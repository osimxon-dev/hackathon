import { logEvent } from '../activity.js';
import { one, query } from '../db.js';
import { conflict } from '../http.js';
import { toDoctor } from '../mappers.js';
import { assertScheduleChangeSafe, getDoctorOrFail, isInFuture } from '../services/booking.js';
import { clinicNow, fromMinutes, isoWeekday, slotStarts } from '../time.js';
import { doctorCreateSchema, doctorListQuery, doctorUpdateSchema, parse, parseId, slotsQuery } from '../validation.js';

const COLUMNS = {
  fullName: 'full_name',
  specialty: 'specialty',
  room: 'room',
  experienceYears: 'experience_years',
  bio: 'bio',
  workDays: 'work_days',
  workStart: 'work_start',
  workEnd: 'work_end',
  slotMinutes: 'slot_minutes',
  isActive: 'is_active',
};

const SCHEDULE_FIELDS = ['workDays', 'workStart', 'workEnd', 'slotMinutes'];

/** GET /api/doctors?search=&specialty=&active= */
async function list({ query: q }) {
  const filters = parse(doctorListQuery, q);
  const where = [];
  const params = [clinicNow().date];
  if (filters.search) {
    params.push(`%${filters.search}%`);
    where.push(`(d.full_name ILIKE $${params.length} OR d.specialty ILIKE $${params.length})`);
  }
  if (filters.specialty) {
    params.push(filters.specialty);
    where.push(`d.specialty = $${params.length}`);
  }
  if (filters.active !== 'all') {
    params.push(filters.active === 'true');
    where.push(`d.is_active = $${params.length}`);
  }
  const { rows } = await query(
    `SELECT d.*,
       (SELECT COUNT(*)::int FROM appointments a
         WHERE a.doctor_id = d.id AND a.status = 'scheduled' AND a.appointment_date >= $1) AS upcoming_count
     FROM doctors d
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY d.is_active DESC, d.specialty, d.full_name`,
    params,
  );
  return { status: 200, body: { data: rows.map(toDoctor) } };
}

/** GET /api/doctors/:id */
async function show({ params }) {
  return { status: 200, body: { data: await getDoctorOrFail(parseId(params.id)) } };
}

/** POST /api/doctors */
async function create({ body }) {
  const d = parse(doctorCreateSchema, body);
  const row = await one(
    `INSERT INTO doctors (full_name, specialty, room, experience_years, bio, work_days, work_start, work_end, slot_minutes, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [d.fullName, d.specialty, d.room, d.experienceYears, d.bio, d.workDays, d.workStart, d.workEnd, d.slotMinutes, d.isActive],
  );
  const doctor = toDoctor(row);
  await logEvent('doctor.created', { doctorId: doctor.id, doctorName: doctor.fullName, specialty: doctor.specialty });
  return { status: 201, body: { data: doctor } };
}

/** PUT /api/doctors/:id va PATCH /api/doctors/:id — qisman yangilash ham qo'llab-quvvatlanadi */
async function update({ params, body }) {
  const id = parseId(params.id);
  const changes = parse(doctorUpdateSchema, body);
  const current = await getDoctorOrFail(id);
  const next = { ...current, ...changes };

  if (next.workEnd <= next.workStart) {
    throw conflict('Ish tugash vaqti boshlanish vaqtidan keyin bo\'lsin');
  }
  if (SCHEDULE_FIELDS.some((f) => f in changes)) {
    await assertScheduleChangeSafe(next);
  }

  const sets = [];
  const values = [];
  for (const [key, value] of Object.entries(changes)) {
    values.push(value);
    sets.push(`${COLUMNS[key]} = $${values.length}`);
  }
  values.push(id);
  const row = await one(
    `UPDATE doctors SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
    values,
  );
  const doctor = toDoctor(row);
  await logEvent('doctor.updated', { doctorId: doctor.id, doctorName: doctor.fullName, specialty: doctor.specialty, fields: Object.keys(body || {}) });
  return { status: 200, body: { data: doctor } };
}

/** DELETE /api/doctors/:id — qabullar tarixi bor shifokor o'chirilmaydi, faolsizlantiriladi */
async function remove({ params }) {
  const id = parseId(params.id);
  await getDoctorOrFail(id);
  const usage = await one(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'scheduled' AND appointment_date >= $2)::int AS upcoming
     FROM appointments WHERE doctor_id = $1`,
    [id, clinicNow().date],
  );
  if (usage.upcoming > 0) {
    throw conflict(`Shifokorda ${usage.upcoming} ta rejalashtirilgan qabul bor. Avval ularni bekor qiling yoki ko'chiring`);
  }
  if (usage.total > 0) {
    throw conflict('Shifokorning qabullar tarixi saqlanadi, shuning uchun uni o\'chirib bo\'lmaydi. Uning o\'rniga faolsizlantiring');
  }
  await one('DELETE FROM doctors WHERE id = $1 RETURNING id', [id]);
  await logEvent('doctor.deleted', { doctorId: id });
  return { status: 204 };
}

/** GET /api/doctors/:id/slots?date=YYYY-MM-DD — kunlik qabul to'ri (bemor ismlarisiz) */
async function slots({ params, query: q }) {
  const doctor = await getDoctorOrFail(parseId(params.id));
  const { date } = parse(slotsQuery, q);
  const now = clinicNow();
  const workingDay = doctor.isActive && doctor.workDays.includes(isoWeekday(date));

  const { rows } = await query(
    `SELECT start_time FROM appointments
     WHERE doctor_id = $1 AND appointment_date = $2 AND status IN ('scheduled', 'completed')`,
    [doctor.id, date],
  );
  const booked = new Set(rows.map((r) => String(r.start_time).slice(0, 5)));

  const result = workingDay
    ? slotStarts(doctor).map((minutes, i) => {
      const time = fromMinutes(minutes);
      let status = 'free';
      if (booked.has(time)) status = 'booked';
      else if (!isInFuture(date, time, now)) status = 'past';
      return { time, ticketNumber: i + 1, status };
    })
    : [];

  return {
    status: 200,
    body: {
      data: {
        doctorId: doctor.id,
        date,
        workingDay,
        freeCount: result.filter((s) => s.status === 'free').length,
        slots: result,
      },
    },
  };
}

/** GET /api/specialties — filtr uchun mutaxassisliklar ro'yxati */
async function specialties() {
  const { rows } = await query(
    `SELECT specialty, COUNT(*)::int AS doctors
     FROM doctors WHERE is_active GROUP BY specialty ORDER BY specialty`,
  );
  return { status: 200, body: { data: rows.map((r) => ({ name: r.specialty, doctors: r.doctors })) } };
}

export function registerDoctorRoutes(router) {
  router
    .get('/api/specialties', specialties)
    .get('/api/doctors', list)
    .post('/api/doctors', create)
    .get('/api/doctors/:id', show)
    .put('/api/doctors/:id', update)
    .patch('/api/doctors/:id', update)
    .delete('/api/doctors/:id', remove)
    .get('/api/doctors/:id/slots', slots);
}

