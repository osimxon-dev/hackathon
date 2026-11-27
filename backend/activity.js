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
  return clientPromise.then((client) => client.db(process.env.MONGODB_DB || 'navbat').collection('activity'));
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
