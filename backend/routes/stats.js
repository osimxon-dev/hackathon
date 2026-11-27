import { one, query } from '../db.js';
import { clinicNow } from '../time.js';

/** GET /api/stats — bosh sahifa va registratura uchun bugungi ko'rsatkichlar */
async function stats() {
  const { date } = clinicNow();
  const today = await one(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled,
       COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
       COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
       COUNT(*) FILTER (WHERE status = 'no_show')::int AS no_show,
       COUNT(*)::int AS total
     FROM appointments WHERE appointment_date = $1`,
    [date],
  );
  const totals = await one(
    `SELECT
       (SELECT COUNT(*)::int FROM doctors WHERE is_active) AS active_doctors,
       (SELECT COUNT(*)::int FROM appointments WHERE status = 'scheduled' AND appointment_date >= $1) AS upcoming`,
    [date],
  );
  const { rows: bySpecialty } = await query(
    `SELECT d.specialty, COUNT(a.id)::int AS appointments
     FROM doctors d
     LEFT JOIN appointments a ON a.doctor_id = d.id AND a.status = 'scheduled' AND a.appointment_date >= $1
     WHERE d.is_active
     GROUP BY d.specialty ORDER BY appointments DESC, d.specialty LIMIT 6`,
    [date],
  );
  return {
    status: 200,
    body: {
      data: {
        date,
        today: {
          total: today.total,
          scheduled: today.scheduled,
          completed: today.completed,
          cancelled: today.cancelled,
          noShow: today.no_show,
        },
        activeDoctors: totals.active_doctors,
        upcoming: totals.upcoming,
        bySpecialty,
      },
    },
  };
}

async function health() {
  await one('SELECT 1 AS ok');
  return { status: 200, body: { status: 'ok', time: new Date().toISOString() } };
}

export function registerStatsRoutes(router) {
  router.get('/api/stats', stats).get('/api/health', health);
}
