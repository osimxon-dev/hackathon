import { z } from 'zod';
import { badRequest } from './http.js';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const trimmed = (min, max, label) =>
  z.string({ required_error: `${label} kiritilishi shart`, invalid_type_error: `${label} matn bo'lishi kerak` })
    .trim()
    .min(min, `${label} kamida ${min} belgidan iborat bo'lsin`)
    .max(max, `${label} ${max} belgidan oshmasin`);

const optionalText = (max, label) =>
  z.union([z.string().trim().max(max, `${label} ${max} belgidan oshmasin`), z.null()])
    .optional()
    .transform((v) => (v ? v : null));

export const time = (label) =>
  z.string({ required_error: `${label} kiritilishi shart` }).regex(TIME_RE, `${label} HH:MM formatida bo'lsin (masalan 09:30)`);

export const date = (label) =>
  z.string({ required_error: `${label} kiritilishi shart` })
    .regex(DATE_RE, `${label} YYYY-MM-DD formatida bo'lsin`)
    .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v), `${label} mavjud sana emas`);

/** O'zbekiston raqami: +998 XX XXX XX XX. Turli yozilishlarni bitta formatga keltiradi. */
export const uzPhone = z
  .string({ required_error: 'Telefon raqami kiritilishi shart' })
  .transform((v) => v.replace(/[\s()-]/g, ''))
  .transform((v) => (v.startsWith('+') ? v : v.startsWith('998') ? `+${v}` : v.length === 9 ? `+998${v}` : v))
  .refine((v) => /^\+998\d{9}$/.test(v), 'Telefon raqami +998 XX XXX XX XX formatida bo\'lsin');

const id = (label) => z.coerce.number({ invalid_type_error: `${label} son bo'lishi kerak` }).int().positive(`${label} musbat butun son bo'lsin`);

export const STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'];

const doctorBase = z.object({
  fullName: trimmed(3, 120, 'F.I.Sh.'),
  specialty: trimmed(2, 80, 'Mutaxassislik'),
  room: trimmed(1, 10, 'Xona raqami'),
  experienceYears: z.coerce.number().int().min(0, 'Tajriba manfiy bo\'lmaydi').max(60, 'Tajriba 60 yildan oshmaydi').default(0),
  bio: optionalText(400, 'Qisqacha ma\'lumot'),
  workDays: z.array(z.number().int().min(1).max(7), { invalid_type_error: 'Ish kunlari ro\'yxat bo\'lishi kerak' })
    .min(1, 'Kamida bitta ish kuni tanlang')
    .transform((days) => [...new Set(days)].sort())
    .default([1, 2, 3, 4, 5]),
  workStart: time('Ish boshlanishi').default('09:00'),
  workEnd: time('Ish tugashi').default('17:00'),
  slotMinutes: z.coerce.number().int().refine((v) => [10, 15, 20, 30, 40, 45, 60].includes(v), 'Qabul davomiyligi 10, 15, 20, 30, 40, 45 yoki 60 daqiqa bo\'lsin').default(20),
  isActive: z.boolean().default(true),
});

const hoursRule = (d) => !d.workStart || !d.workEnd || d.workEnd > d.workStart;
const hoursIssue = { message: 'Ish tugash vaqti boshlanish vaqtidan keyin bo\'lsin', path: ['workEnd'] };

export const doctorCreateSchema = doctorBase.strict().refine(hoursRule, hoursIssue);
export const doctorUpdateSchema = doctorBase.partial().strict().refine(hoursRule, hoursIssue)
  .refine((d) => Object.keys(d).length > 0, 'Yangilash uchun kamida bitta maydon yuboring');

export const doctorListQuery = z.object({
  search: z.string().trim().max(80).optional(),
  specialty: z.string().trim().max(80).optional(),
  active: z.enum(['true', 'false', 'all']).default('all'),
});

export const appointmentCreateSchema = z.object({
  doctorId: id('Shifokor ID'),
  patientName: trimmed(3, 100, 'Bemor ismi'),
  patientPhone: uzPhone,
  complaint: optionalText(500, 'Shikoyat'),
  appointmentDate: date('Sana'),
  startTime: time('Vaqt'),
}).strict();

export const appointmentUpdateSchema = z.object({
  doctorId: id('Shifokor ID'),
  patientName: trimmed(3, 100, 'Bemor ismi'),
  patientPhone: uzPhone,
  complaint: optionalText(500, 'Shikoyat'),
  appointmentDate: date('Sana'),
  startTime: time('Vaqt'),
  status: z.enum(STATUSES, { errorMap: () => ({ message: `Holat quyidagilardan biri bo'lsin: ${STATUSES.join(', ')}` }) }),
}).partial().strict().refine((d) => Object.keys(d).length > 0, 'Yangilash uchun kamida bitta maydon yuboring');

export const appointmentListQuery = z.object({
  doctorId: id('Shifokor ID').optional(),
  date: date('Sana').optional(),
  from: date('Boshlanish sanasi').optional(),
  to: date('Tugash sanasi').optional(),
  status: z.enum([...STATUSES, 'all']).default('all'),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const slotsQuery = z.object({ date: date('Sana') });

export const nearestQuery = z.object({
  specialty: z.string().trim().max(80).optional(),
  doctorId: id('Shifokor ID').optional(),
});

export const idParam = id('ID');

/** Zod sxemasi bilan tekshiradi; xato bo'lsa 400 va maydonlar bo'yicha tafsilot. */
export function parse(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const details = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    if (issue.code === 'unrecognized_keys') {
      details._ = `Noma'lum maydon(lar): ${issue.keys.join(', ')}`;
    } else if (!details[key]) {
      details[key] = issue.message;
    }
  }
  const first = Object.values(details)[0] || 'Ma\'lumotlar noto\'g\'ri';
  throw badRequest(first, details);
}

export function parseId(value) {
  return parse(idParam, value);
}
