import { appointmentFields, logEvent } from '../activity.js';
import { one, query } from '../db.js';
import { conflict, notFound } from '../http.js';
import { APPOINTMENT_SELECT, toAppointment, toDoctor } from '../mappers.js';
import {
  assertBookableTime,
  assertNoConflicts,
  assertStatusTransition,
  getDoctorOrFail,
  isInFuture,
  mapDbConflict,
} from '../services/booking.js';
import { addDays, clinicNow, fromMinutes, isoWeekday, slotStarts } from '../time.js';
import {
  appointmentCreateSchema,
  appointmentListQuery,
  appointmentUpdateSchema,
  nearestQuery,
  parse,
  parseId,
} from '../validation.js';

const COLUMNS = {
  doctorId: 'doctor_id',
  patientName: 'patient_name',
  patientPhone: 'patient_phone',
  complaint: 'complaint',
  appointmentDate: 'appointment_date',
  startTime: 'start_time',
  status: 'status',
};

async function findAppointment(id) {
  const appointment = toAppointment(await one(`${APPOINTMENT_SELECT} WHERE a.id = $1`, [id]));
  if (!appointment) throw notFound('Qabul topilmadi');
  return appointment;
}

/** GET /api/appointments?doctorId=&date=&from=&to=&status=&search=&page=&limit= */
async function list({ query: q }) {
  const f = parse(appointmentListQuery, q);
  const where = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace('?', `$${params.length}`));
  };

  if (f.doctorId) add('a.doctor_id = ?', f.doctorId);
  if (f.date) add('a.appointment_date = ?', f.date);
  if (f.from) add('a.appointment_date >= ?', f.from);
  if (f.to) add('a.appointment_date <= ?', f.to);
  if (f.status !== 'all') add('a.status = ?', f.status);
  if (f.search) {
    const digits = f.search.replace(/\D/g, '');
    params.push(`%${f.search}%`);
    const nameIdx = params.length;
    let clause = `a.patient_name ILIKE $${nameIdx}`;
    if (digits.length >= 3) {
      params.push(`%${digits}%`);
      clause += ` OR a.patient_phone LIKE $${params.length}`;
    }
    where.push(`(${clause})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const totalRow = await one(`SELECT COUNT(*)::int AS total FROM appointments a ${whereSql}`, params);
  const offset = (f.page - 1) * f.limit;
  const { rows } = await query(
    `${APPOINTMENT_SELECT} ${whereSql}
     ORDER BY a.appointment_date DESC, a.start_time ASC, a.id ASC
     LIMIT ${f.limit} OFFSET ${offset}`,
    params,
  );

  return {
    status: 200,
    body: {
      data: rows.map(toAppointment),
      meta: { total: totalRow.total, page: f.page, limit: f.limit, pages: Math.max(1, Math.ceil(totalRow.total / f.limit)) },
    },
  };
}

/** GET /api/appointments/:id */
async function show({ params }) {
  return { status: 200, body: { data: await findAppointment(parseId(params.id)) } };
}

/** POST /api/appointments — navbatga yozilish */
async function create({ body }) {
  const input = parse(appointmentCreateSchema, body);
  const doctor = await getDoctorOrFail(input.doctorId);
  assertBookableTime(doctor, input.appointmentDate, input.startTime);
  await assertNoConflicts(input);

  let row;
  try {
    row = await one(
      `INSERT INTO appointments (doctor_id, patient_name, patient_phone, complaint, appointment_date, start_time)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [input.doctorId, input.patientName, input.patientPhone, input.complaint, input.appointmentDate, input.startTime],
    );
  } catch (err) {
    throw mapDbConflict(err);
  }
  const created = await findAppointment(row.id);
  await logEvent('appointment.created', appointmentFields(created));
  return { status: 201, body: { data: created } };
}

/** PATCH /api/appointments/:id — ma'lumotni tahrirlash, ko'chirish yoki holatini o'zgartirish */
async function update({ params, body }) {
  const id = parseId(params.id);
  const changes = parse(appointmentUpdateSchema, body);
  const current = await findAppointment(id);

  if (current.status !== 'scheduled') {
    throw conflict('Yakunlangan yoki bekor qilingan qabulni o\'zgartirib bo\'lmaydi');
  }

  const next = { ...current, ...changes };
  const { status: nextStatus = current.status, ...fieldChanges } = changes;
  const touchesSlot = ['doctorId', 'appointmentDate', 'startTime'].some((k) => k in changes && changes[k] !== current[k]);
  const touchesPatient = 'patientPhone' in changes && changes.patientPhone !== current.patientPhone;

  if (nextStatus !== current.status && Object.keys(fieldChanges).length > 0) {
    throw conflict('Holatni o\'zgartirish va ma\'lumotlarni tahrirlashni alohida so\'rovlarda bajaring');
  }

  assertStatusTransition(current.status, nextStatus, current);

  if (nextStatus === 'scheduled' && (touchesSlot || touchesPatient)) {
    const doctor = await getDoctorOrFail(next.doctorId);
    if (touchesSlot) assertBookableTime(doctor, next.appointmentDate, next.startTime);
    await assertNoConflicts(next, id);
  }

  const sets = [];
  const values = [];
  for (const [key, value] of Object.entries(changes)) {
    values.push(value);
    sets.push(`${COLUMNS[key]} = $${values.length}`);
  }
  values.push(id);
  try {
    await one(`UPDATE appointments SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING id`, values);
  } catch (err) {
    throw mapDbConflict(err);
  }
  const updated = await findAppointment(id);
  const event = nextStatus !== current.status ? `appointment.${nextStatus}` : touchesSlot ? 'appointment.moved' : 'appointment.edited';
  await logEvent(event, {
    ...appointmentFields(updated),
    ...(touchesSlot && { from: { doctorId: current.doctorId, date: current.appointmentDate, time: current.startTime } }),
  });
  return { status: 200, body: { data: updated } };
}

/** DELETE /api/appointments/:id — bo'lib o'tgan qabul tibbiy tarix sifatida saqlanadi */
async function remove({ params }) {
  const id = parseId(params.id);
  const current = await findAppointment(id);
  if (current.status === 'completed') {
    throw conflict('Bo\'lib o\'tgan qabul tibbiy tarix hisoblanadi va o\'chirilmaydi');
  }
  await one('DELETE FROM appointments WHERE id = $1 RETURNING id', [id]);
  await logEvent('appointment.deleted', appointmentFields(current));
  return { status: 204 };
}

/**
 * GET /api/slots/nearest?specialty=&doctorId=
 * Eng yaqin bo'sh navbat: tanlangan mutaxassislik bo'yicha barcha shifokorlar
 * jadvalidan 14 kun ichidagi birinchi bo'sh vaqtni topadi.
 */
async function nearest({ query: q }) {
  const f = parse(nearestQuery, q);
  const now = clinicNow();
  const horizon = 14;

  const params = [];
  const where = ['is_active'];
  if (f.specialty) { params.push(f.specialty); where.push(`specialty = $${params.length}`); }
  if (f.doctorId) { params.push(f.doctorId); where.push(`id = $${params.length}`); }
  const { rows: doctorRows } = await query(`SELECT * FROM doctors WHERE ${where.join(' AND ')}`, params);
  if (doctorRows.length === 0) {
    return { status: 200, body: { data: null } };
  }
  const doctors = doctorRows.map(toDoctor);

  const { rows: bookedRows } = await query(
    `SELECT doctor_id, appointment_date, start_time FROM appointments
     WHERE doctor_id = ANY($1) AND appointment_date BETWEEN $2 AND $3 AND status IN ('scheduled', 'completed')`,
    [doctors.map((d) => d.id), now.date, addDays(now.date, horizon)],
  );
  const booked = new Set(bookedRows.map((r) => `${r.doctor_id}|${r.appointment_date}|${String(r.start_time).slice(0, 5)}`));

  for (let offset = 0; offset <= horizon; offset++) {
    const date = addDays(now.date, offset);
    const weekday = isoWeekday(date);
    let best = null;
    for (const doctor of doctors) {
      if (!doctor.workDays.includes(weekday)) continue;
      const starts = slotStarts(doctor);
      for (let i = 0; i < starts.length; i++) {
        const time = fromMinutes(starts[i]);
        if (!isInFuture(date, time, now) || booked.has(`${doctor.id}|${date}|${time}`)) continue;
        if (!best || starts[i] < best.minutes) best = { minutes: starts[i], time, doctor, ticketNumber: i + 1 };
        break;
      }
    }
    if (best) {
      const { doctor } = best;
      return {
        status: 200,
        body: {
          data: {
            date,
            time: best.time,
            ticketNumber: best.ticketNumber,
            daysFromToday: offset,
            doctor: { id: doctor.id, fullName: doctor.fullName, specialty: doctor.specialty, room: doctor.room },
          },
        },
      };
    }
  }
  return { status: 200, body: { data: null } };
}

export function registerAppointmentRoutes(router) {
  router
    .get('/api/appointments', list)
    .post('/api/appointments', create)
    .get('/api/appointments/:id', show)
    .patch('/api/appointments/:id', update)
    .delete('/api/appointments/:id', remove)
    .get('/api/slots/nearest', nearest);
}
