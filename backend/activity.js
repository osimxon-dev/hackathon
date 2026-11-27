// Faollik jurnali — MongoDB.
// Tranzaksion ma'lumot (shifokorlar, qabullar, biznes qoidalar) PostgreSQL'da qoladi:
// u yerda unique indekslar va advisory lock band vaqtni poyga holatidan himoya qiladi.
// MongoDB esa o'zgarmas hodisalar oqimini saqlaydi: kim qachon yozildi, ko'chirildi, bekor qildi.
// MONGODB_URI berilmasa jurnal o'chiq turadi va ilova odatdagidek ishlaydi.
import { MongoClient } from 'mongodb';

let clientPromise = null;

export const activityEnabled = () => Boolean(process.env.MONGODB_URI);

function getCollection() {
  if (!activityEnabled()) return null;
  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 2500, maxPoolSize: 3 });
    clientPromise = client.connect().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise.then(async (client) => {
    const collection = client.db(process.env.MONGODB_DB || 'navbat').collection('activity');
    await seedDemoEvents(collection);
    return collection;
  });
}

// Jurnal bo'sh bo'lsa, demo hodisalar qo'shiladi (SEED_DEMO_DATA=false bilan o'chiriladi).
let seeded = false;
async function seedDemoEvents(collection) {
  if (seeded || process.env.SEED_DEMO_DATA === 'false') return;
  seeded = true;
  if ((await collection.estimatedDocumentCount()) > 0) return;
  const now = Date.now();
  const day = new Date(now + 86400000).toISOString().slice(0, 10);
  const day2 = new Date(now + 2 * 86400000).toISOString().slice(0, 10);
  const ev = (minAgo, type, doctorId, doctorName, specialty, date, time, ticketNumber, extra = {}) => ({
    type, appointmentId: 100 + Math.round(minAgo), doctorId, doctorName, specialty, date, time, ticketNumber, demo: true, ...extra,
    at: new Date(now - minAgo * 60000),
  });
  await collection.insertMany([
    ev(3, 'appointment.created', 2, 'Toshmatov Bekzod Anvarovich', 'Kardiolog', day, '09:30', 2),
    ev(11, 'appointment.created', 1, 'Karimova Dilnoza Rustamovna', 'Terapevt', day, '08:40', 3),
    ev(26, 'appointment.moved', 4, 'Yusupova Malika Shavkatovna', 'Pediatr', day2, '10:15', 5, { from: { doctorId: 4, date: day, time: '09:45' } }),
    ev(41, 'appointment.cancelled', 3, 'Rahimov Jasur Olimovich', 'Nevrolog', day, '11:00', 3),
    ev(58, 'appointment.created', 5, 'Abdullayeva Nigora Baxtiyorovna', 'Stomatolog', day, '09:45', 2),
    ev(75, 'appointment.completed', 6, 'Qodirov Otabek Murodovich', 'Oftalmolog', day, '08:20', 1),
    ev(102, 'doctor.updated', 7, 'Nazarova Shahlo Akmalovna', 'Endokrinolog', undefined, undefined, undefined, { fields: ['workEnd'] }),
    ev(140, 'appointment.no_show', 1, 'Ergashev Sardor Ilhomovich', 'Terapevt', day, '14:20', 4),
    ev(190, 'appointment.created', 7, 'Nazarova Shahlo Akmalovna', 'Endokrinolog', day2, '09:30', 2),
    ev(260, 'doctor.created', 8, 'Sinov Shifokor', 'Terapevt', undefined, undefined, undefined),
    ev(330, 'appointment.completed', 2, 'Toshmatov Bekzod Anvarovich', 'Kardiolog', day, '09:00', 1),
    ev(410, 'appointment.created', 6, 'Qodirov Otabek Murodovich', 'Oftalmolog', day2, '08:40', 2),
  ]);
}

/** Hodisani yozadi. Jurnal ishlamasa ham asosiy amal (yozilish va h.k.) muvaffaqiyatli qoladi. */
export async function logEvent(type, data = {}) {
  const pending = getCollection();
  if (!pending) return;
  try {
    const collection = await pending;
    await collection.insertOne({ type, ...data, at: new Date() });
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') console.warn('[activity] MongoDB ga yozilmadi:', err.message);
  }
}

export async function recentEvents({ limit = 30, type } = {}) {
  const collection = await getCollection();
  const filter = type ? { type: { $regex: `^${type.replace(/[^a-z_.]/gi, '')}` } } : {};
  const docs = await collection.find(filter).sort({ at: -1 }).limit(limit).toArray();
  return docs.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest }));
}

/** Qabul hodisasi uchun umumiy maydonlar (bemor telefoni jurnalga yozilmaydi) */
export const appointmentFields = (a) => ({
  appointmentId: a.id,
  doctorId: a.doctorId,
  doctorName: a.doctor?.fullName,
  specialty: a.doctor?.specialty,
  date: a.appointmentDate,
  time: a.startTime,
  ticketNumber: a.ticketNumber,
});
