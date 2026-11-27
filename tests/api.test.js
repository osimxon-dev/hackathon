// API avtotestlari: biznes qoidalar, validatsiya va status kodlari.
// Ishga tushirish: DATABASE_URL=postgresql://localhost/navbat_test npm test
// Diqqat: testlar alohida (bo'sh) bazada ishga tushirilishi kerak.
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { dispatch } from '../server/app.js';
import { addDays, clinicNow, isoWeekday } from '../server/time.js';

process.env.NODE_ENV = 'test';

const call = (method, url, body) => dispatch({
  method,
  url: `http://localhost/api${url}`,
  contentType: 'application/json',
  readBody: async () => (body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body)),
});

/** Shifokorning keyingi ish kuni (ertadan boshlab) */
function nextWorkingDay(workDays, startOffset = 1) {
  const today = clinicNow().date;
  for (let i = startOffset; i < startOffset + 8; i++) {
    const date = addDays(today, i);
    if (workDays.includes(isoWeekday(date))) return date;
  }
  throw new Error('ish kuni topilmadi');
}

let doctor;
let date;

before(async () => {
  const res = await call('POST', '/doctors', {
    fullName: 'Test Shifokor Testovich',
    specialty: 'Test mutaxassis',
    room: '999',
    workDays: [1, 2, 3, 4, 5, 6, 7],
    workStart: '09:00',
    workEnd: '12:00',
    slotMinutes: 30,
  });
  assert.equal(res.status, 201);
  doctor = res.body.data;
  date = nextWorkingDay(doctor.workDays);
});

describe('Shifokorlar', () => {
  test('ro\'yxat, qidiruv va 404', async () => {
    const list = await call('GET', '/doctors?search=Testovich');
    assert.equal(list.status, 200);
    assert.ok(list.body.data.some((d) => d.id === doctor.id));
    assert.equal((await call('GET', '/doctors/999999')).status, 404);
  });

  test('noto\'g\'ri ish soatlari 400 qaytaradi', async () => {
    const res = await call('POST', '/doctors', { fullName: 'Xato Jadval', specialty: 'Lor', room: '1', workStart: '18:00', workEnd: '09:00' });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
    assert.ok(res.body.details.workEnd);
  });

  test('kunlik jadval to\'g\'ri hisoblanadi', async () => {
    const res = await call('GET', `/doctors/${doctor.id}/slots?date=${date}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.slots.length, 6); // 09:00–12:00, har 30 daqiqa
  });
});

describe('Qabullar va biznes qoidalar', () => {
  const patient = { patientName: 'Test Bemor', patientPhone: '90 123 45 67' };
  let appointmentId;

  test('navbatga yozilish 201, telefon normallashtiriladi', async () => {
    const res = await call('POST', '/appointments', { doctorId: doctor.id, ...patient, appointmentDate: date, startTime: '09:00' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.patientPhone, '+998901234567');
    assert.equal(res.body.data.ticketNumber, 1);
    appointmentId = res.body.data.id;
  });

  test('band vaqtga ikkinchi marta yozilib bo\'lmaydi (409)', async () => {
    const res = await call('POST', '/appointments', { doctorId: doctor.id, patientName: 'Boshqa Bemor', patientPhone: '+998931112233', appointmentDate: date, startTime: '09:00' });
    assert.equal(res.status, 409);
  });

  test('bemor bir shifokorga bir kunda bir marta yoziladi (409)', async () => {
    const res = await call('POST', '/appointments', { doctorId: doctor.id, ...patient, appointmentDate: date, startTime: '10:00' });
    assert.equal(res.status, 409);
  });

  test('jadvalga mos kelmagan vaqt (422)', async () => {
    const res = await call('POST', '/appointments', { doctorId: doctor.id, patientName: 'Uchinchi Bemor', patientPhone: '+998941112233', appointmentDate: date, startTime: '09:10' });
    assert.equal(res.status, 422);
  });

  test('o\'tgan sanaga yozilib bo\'lmaydi (422)', async () => {
    const res = await call('POST', '/appointments', { doctorId: doctor.id, patientName: 'Uchinchi Bemor', patientPhone: '+998941112233', appointmentDate: addDays(clinicNow().date, -1), startTime: '09:00' });
    assert.equal(res.status, 422);
  });

  test('validatsiya xatolari { error, details } ko\'rinishida (400)', async () => {
    const res = await call('POST', '/appointments', { doctorId: 'x', patientName: 'A', patientPhone: '123', appointmentDate: '2026-13-45', startTime: '25:00' });
    assert.equal(res.status, 400);
    assert.equal(typeof res.body.error, 'string');
    assert.ok(res.body.details.patientPhone);
  });

  test('yaroqsiz JSON 400 qaytaradi', async () => {
    const res = await call('POST', '/appointments', '{buzuq');
    assert.equal(res.status, 400);
  });

  test('kelajakdagi qabulni "bo\'ldi" deb belgilab bo\'lmaydi (422)', async () => {
    const res = await call('PATCH', `/appointments/${appointmentId}`, { status: 'completed' });
    assert.equal(res.status, 422);
  });

  test('qabulni ko\'chirish va filtr', async () => {
    const moved = await call('PATCH', `/appointments/${appointmentId}`, { startTime: '10:30' });
    assert.equal(moved.status, 200);
    assert.equal(moved.body.data.startTime, '10:30');
    const list = await call('GET', `/appointments?doctorId=${doctor.id}&status=scheduled&search=Test`);
    assert.equal(list.body.meta.total, 1);
  });

  test('rejalashtirilgan qabuli bor shifokorni o\'chirib bo\'lmaydi (409)', async () => {
    assert.equal((await call('DELETE', `/doctors/${doctor.id}`)).status, 409);
  });

  test('jadvalni qabulni buzadigan qilib o\'zgartirib bo\'lmaydi (409)', async () => {
    assert.equal((await call('PATCH', `/doctors/${doctor.id}`, { workEnd: '10:00' })).status, 409);
  });

  test('bekor qilingan qabul tahrirlanmaydi, lekin o\'chiriladi', async () => {
    assert.equal((await call('PATCH', `/appointments/${appointmentId}`, { status: 'cancelled' })).status, 200);
    assert.equal((await call('PATCH', `/appointments/${appointmentId}`, { patientName: 'Yangi Ism' })).status, 409);
    assert.equal((await call('DELETE', `/appointments/${appointmentId}`)).status, 204);
    assert.equal((await call('GET', `/appointments/${appointmentId}`)).status, 404);
  });

  test('noma\'lum manzil 404, noto\'g\'ri usul 405', async () => {
    assert.equal((await call('GET', '/yoq')).status, 404);
    assert.equal((await call('PUT', '/appointments/1', {})).status, 405);
  });
});
