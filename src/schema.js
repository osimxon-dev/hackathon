/**
 * Ma'lumotlar bazasi sxemasi. Idempotent: har sovuq ishga tushishda xavfsiz bajariladi.
 * Advisory lock bir vaqtda ishga tushgan bir nechta serverless instansiyani tartiblaydi.
 */
export const MIGRATION_SQL = `
SELECT pg_advisory_xact_lock(735001);

CREATE TABLE IF NOT EXISTS doctors (
  id              SERIAL PRIMARY KEY,
  full_name       VARCHAR(120) NOT NULL,
  specialty       VARCHAR(80)  NOT NULL,
  room            VARCHAR(10)  NOT NULL,
  experience_years SMALLINT    NOT NULL DEFAULT 0 CHECK (experience_years BETWEEN 0 AND 60),
  bio             VARCHAR(400),
  work_days       SMALLINT[]   NOT NULL DEFAULT '{1,2,3,4,5}',
  work_start      TIME         NOT NULL DEFAULT '09:00',
  work_end        TIME         NOT NULL DEFAULT '17:00',
  slot_minutes    SMALLINT     NOT NULL DEFAULT 20 CHECK (slot_minutes BETWEEN 10 AND 60),
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT doctors_work_hours_check CHECK (work_end > work_start)
);

CREATE TABLE IF NOT EXISTS appointments (
  id               SERIAL PRIMARY KEY,
  doctor_id        INTEGER      NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  patient_name     VARCHAR(100) NOT NULL,
  patient_phone    VARCHAR(13)  NOT NULL,
  complaint        VARCHAR(500),
  appointment_date DATE         NOT NULL,
  start_time       TIME         NOT NULL,
  status           VARCHAR(12)  NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Biznes qoida (poyga holatiga ham chidamli): bitta shifokorning bitta vaqtiga faqat bitta faol qabul
CREATE UNIQUE INDEX IF NOT EXISTS uniq_doctor_slot
  ON appointments (doctor_id, appointment_date, start_time)
  WHERE status IN ('scheduled', 'completed');

-- Bitta bemor bir vaqtning o'zida ikki joyda bo'la olmaydi
CREATE UNIQUE INDEX IF NOT EXISTS uniq_patient_slot
  ON appointments (patient_phone, appointment_date, start_time)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (appointment_date, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments (doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_phone ON appointments (patient_phone);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors (specialty);
`;
