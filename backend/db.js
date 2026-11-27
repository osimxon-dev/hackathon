import pg from 'pg';
import { MIGRATION_SQL } from './schema.js';
import { seedDemoData } from './seed.js';

const { Pool, types } = pg;

// DATE ustunlarini JS Date'ga aylantirmaymiz — vaqt zonasi siljishining oldini oladi
types.setTypeParser(1082, (value) => value);

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.STORAGE_URL || process.env.STORAGE_DATABASE_URL;

let pool;
function getPool() {
  if (!connectionString) {
    throw new Error('DATABASE_URL muhit o\'zgaruvchisi o\'rnatilmagan (.env.example ga qarang)');
  }
  if (!pool) {
    const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
    pool = new Pool({
      connectionString,
      max: Number(process.env.DB_POOL_MAX || 3),
      idleTimeoutMillis: 10_000,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
    pool.on('error', (err) => console.error('[db] pool error', err.message));
  }
  return pool;
}

export async function query(text, params = []) {
  await ensureReady();
  return getPool().query(text, params);
}

export async function one(text, params) {
  const { rows } = await query(text, params);
  return rows[0] ?? null;
}

let readyPromise;
/** Sxemani yaratadi va baza bo'sh bo'lsa demo ma'lumot qo'shadi (bir marta). */
export function ensureReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await getPool().query(MIGRATION_SQL);
      if (process.env.SEED_DEMO_DATA !== 'false') {
        await seedDemoData((text, params) => getPool().query(text, params));
      }
    })().catch((err) => {
      readyPromise = undefined; // keyingi so'rovda qayta urinish
      throw err;
    });
  }
  return readyPromise;
}

/** Postgres xato kodlari */
export const PG = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  CHECK_VIOLATION: '23514',
};
