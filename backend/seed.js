/**
 * Demo ma'lumotlar: baza bo'sh bo'lsa, shifokorlar va bir nechta qabul qo'shiladi.
 * Hakam/foydalanuvchi ilovani ochganda bo'sh ekran emas, jonli holatni ko'radi.
 */
import { addDays, clinicNow, fromMinutes, isoWeekday, slotStarts } from './time.js';

const DOCTORS = [
  ['Karimova Dilnoza Rustamovna', 'Terapevt', '104', 12, 'Umumiy tekshiruv, shamollash, qon bosimi nazorati.', [1, 2, 3, 4, 5, 6], '08:00', '14:00', 20],
  ['Toshmatov Bekzod Anvarovich', 'Kardiolog', '211', 18, 'Yurak ritmi buzilishi, EKG xulosasi, gipertoniya.', [1, 3, 5], '09:00', '15:00', 30],
  ['Yusupova Malika Shavkatovna', 'Pediatr', '108', 9, 'Bolalar salomatligi, emlash jadvali, o\'sish nazorati.', [1, 2, 3, 4, 5], '08:30', '13:30', 15],
  ['Rahimov Jasur Olimovich', 'Nevrolog', '305', 15, 'Bosh og\'rig\'i, bel og\'rig\'i, uyqu buzilishi.', [2, 4, 6], '10:00', '16:00', 30],
  ['Abdullayeva Nigora Baxtiyorovna', 'Stomatolog', '012', 7, 'Tish davolash va profilaktik ko\'rik.', [1, 2, 3, 4, 5, 6], '09:00', '18:00', 45],
  ['Ergashev Sardor Ilhomovich', 'Terapevt', '106', 6, 'Surunkali kasalliklar kuzatuvi, retsept yangilash.', [1, 2, 3, 4, 5], '13:00', '19:00', 20],
  ['Nazarova Shahlo Akmalovna', 'Endokrinolog', '214', 20, 'Qandli diabet, qalqonsimon bez kasalliklari.', [1, 2, 4, 5], '09:00', '14:00', 30],
  ['Qodirov Otabek Murodovich', 'Oftalmolog', '120', 11, 'Ko\'rish o\'tkirligi, ko\'z bosimi, ko\'zoynak tanlash.', [2, 3, 5, 6], '08:00', '13:00', 20],
];

const PATIENTS = [
  ['Aliyev Sherzod', '+998901234567', 'Bosh aylanishi, holsizlik'],
  ['Saidova Gulnora', '+998935557788', 'Qon bosimi ko\'tarilishi'],
  ['Mirzayev Akbar', '+998977001122', 'Profilaktik ko\'rik'],
  ['Umarova Zarina', '+998881239900', 'Tish og\'rig\'i'],
  ['Xolmatov Ravshan', '+998946662211', 'Bel og\'rig\'i'],
  ['Ismoilova Feruza', '+998903332244', null],
];

export async function seedDemoData(run) {
  const { rows } = await run('SELECT COUNT(*)::int AS count FROM doctors');
  if (rows[0].count > 0) return;

  const doctors = [];
  for (const d of DOCTORS) {
    const res = await run(
      `INSERT INTO doctors (full_name, specialty, room, experience_years, bio, work_days, work_start, work_end, slot_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      d,
    );
    doctors.push({ id: res.rows[0].id, workDays: d[5], workStart: d[6], workEnd: d[7], slotMinutes: d[8] });
  }

  // Har bir shifokorga yaqin 3 ish kunida 2 tadan qabul (kun o'rtasida, kelajakda)
  const now = clinicNow();
  let p = 0;
  for (const doctor of doctors.slice(0, 6)) {
    let placed = 0;
    for (let offset = 1; offset <= 7 && placed < 2; offset++) {
      const date = addDays(now.date, offset);
      if (!doctor.workDays.includes(isoWeekday(date))) continue;
      const starts = slotStarts(doctor);
      const time = fromMinutes(starts[Math.min(2 + placed * 3, starts.length - 1)]);
      const [name, phone, complaint] = PATIENTS[p % PATIENTS.length];
      p += 1;
      await run(
        `INSERT INTO appointments (doctor_id, patient_name, patient_phone, complaint, appointment_date, start_time)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
        [doctor.id, name, phone, complaint, date, time],
      );
      placed += 1;
    }
  }
}
