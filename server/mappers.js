import { shortTime, ticketNumber } from './time.js';

/** Bazadagi snake_case qatorni API uchun camelCase obyektga aylantiradi. */
export function toDoctor(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    specialty: row.specialty,
    room: row.room,
    experienceYears: row.experience_years,
    bio: row.bio,
    workDays: (row.work_days || []).map(Number),
    workStart: shortTime(row.work_start),
    workEnd: shortTime(row.work_end),
    slotMinutes: row.slot_minutes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.upcoming_count !== undefined && { upcomingCount: Number(row.upcoming_count) }),
  };
}

export function toAppointment(row) {
  if (!row) return null;
  const appointment = {
    id: row.id,
    doctorId: row.doctor_id,
    patientName: row.patient_name,
    patientPhone: row.patient_phone,
    complaint: row.complaint,
    appointmentDate: row.appointment_date,
    startTime: shortTime(row.start_time),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.doctor_full_name) {
    const doctor = {
      id: row.doctor_id,
      fullName: row.doctor_full_name,
      specialty: row.doctor_specialty,
      room: row.doctor_room,
      workStart: shortTime(row.doctor_work_start),
      workEnd: shortTime(row.doctor_work_end),
      slotMinutes: row.doctor_slot_minutes,
    };
    appointment.doctor = { id: doctor.id, fullName: doctor.fullName, specialty: doctor.specialty, room: doctor.room };
    appointment.ticketNumber = ticketNumber(doctor, appointment.startTime);
  }
  return appointment;
}

/** Qabul + shifokor ma'lumotini bitta so'rovda olish uchun SELECT qismi */
export const APPOINTMENT_SELECT = `
  SELECT a.*, d.full_name AS doctor_full_name, d.specialty AS doctor_specialty, d.room AS doctor_room,
         d.work_start AS doctor_work_start, d.work_end AS doctor_work_end, d.slot_minutes AS doctor_slot_minutes
  FROM appointments a
  JOIN doctors d ON d.id = a.doctor_id`;
