# Navbat — shifokor qabuliga onlayn yozilish

**Yo'nalish:** HealthTech (tibbiyot va salomatlik)

## Qanday muammo?

Davlat poliklinikalarida shifokor qabuliga yozilish uchun bemor ertalab erta kelib, registratura oldida navbatda turadi. Keyin yana shifokor eshigi oldida soatlab kutadi. Kim qachon kirishi noma'lum, bir vaqtga ikki kishi yozilib qoladi, keksalar va bolali ota-onalar uchun bu ayniqsa og'ir.

## Kim uchun?

- **Bemorlar:** uydan turib bo'sh vaqtni ko'radi, aniq soat va chipta raqamini oladi.
- **Registratura xodimlari:** qabullar ro'yxatini yuritadi, vaqtni ko'chiradi, qabul bo'lganini yoki bemor kelmaganini belgilaydi.
- **Poliklinika boshqaruvi:** shifokorlar, ularning ish kunlari va soatlarini boshqaradi.

## Ilova muammoni qanday hal qiladi?

1. Har bir shifokorning ish jadvalidan (ish kunlari, soatlari, bitta qabul davomiyligi) **kunlik vaqt to'ri** avtomatik hosil bo'ladi.
2. Bemor bo'sh vaqtni tanlaydi va **navbat chiptasini** (raqam, xona, vaqt) oladi.
3. **"Eng yaqin bo'sh navbat"**: bemor faqat mutaxassislikni tanlaydi, tizim shu sohadagi barcha shifokorlar jadvalidan 14 kun ichidagi eng birinchi bo'sh vaqtni topib beradi.
4. Server darajasidagi biznes qoidalar ikki marta yozilish, o'tgan vaqtga yozilish va jadvaldan tashqari yozilishga yo'l qo'ymaydi.

---

## Biznes qoidalar

Barcha qoidalar [`backend/services/booking.js`](backend/services/booking.js) faylida joylashgan.

| # | Qoida | Javob |
|---|-------|-------|
| 1 | Bitta shifokorning bitta vaqtiga faqat bitta faol qabul. Poyga holatida ham ishlaydi: PostgreSQL partial unique index | `409` |
| 2 | Bemor bir vaqtning o'zida ikki shifokor qabulida bo'la olmaydi | `409` |
| 3 | Bemor bitta shifokorga bir kunda faqat bir marta yoziladi | `409` |
| 4 | O'tib ketgan vaqtga yozilib bo'lmaydi (Toshkent vaqti, UTC+5) | `422` |
| 5 | Ko'pi bilan 30 kun oldinga yoziladi | `422` |
| 6 | Faqat shifokorning ish kunida, ish soatlari ichida va qabul qadamiga mos vaqtga | `422` |
| 7 | Faol bo'lmagan shifokorga yozilib bo'lmaydi | `422` |
| 8 | Holatlar oqimi: `scheduled → completed / cancelled / no_show`. Yakuniy holat o'zgarmaydi | `409` |
| 9 | Vaqti kelmagan qabulni "bo'ldi" yoki "kelmadi" deb belgilab bo'lmaydi | `422` |
| 10 | Bo'lib o'tgan qabul tibbiy tarix hisoblanadi va o'chirilmaydi | `409` |
| 11 | Rejalashtirilgan qabuli yoki tarixi bor shifokor o'chirilmaydi: uni faolsizlantirish kerak | `409` |
| 12 | Shifokor jadvalini mavjud qabullar sig'maydigan qilib o'zgartirib bo'lmaydi | `409` |

## Ma'lumotlar modeli

```
doctors (1) ──────< (N) appointments
  id, full_name, specialty, room,        id, doctor_id → doctors.id,
  experience_years, bio, work_days[],    patient_name, patient_phone, complaint,
  work_start, work_end, slot_minutes,    appointment_date, start_time,
  is_active, created_at, updated_at      status, created_at, updated_at
```

Sxema birinchi so'rovda avtomatik yaratiladi ([`backend/schema.js`](backend/schema.js)). Bir vaqtda ishga tushgan serverless instansiyalar `pg_advisory_xact_lock` bilan tartiblanadi. Baza bo'sh bo'lsa, 8 ta demo shifokor va bir nechta qabul qo'shiladi (`SEED_DEMO_DATA=false` bilan o'chiriladi).

---

## Ishga tushirish

Talablar: Node.js 20+ va PostgreSQL 14+ (lokal yoki [Neon](https://neon.tech)).

```bash
git clone https://github.com/osimxon-dev/hackathon.git navbat
cd navbat
npm install
cp .env.example .env          # DATABASE_URL ni o'zingiznikiga almashtiring
npm run dev                   # http://localhost:3000
```

Production build:

```bash
npm run build && npm start
```

Avtotestlar (16 ta: biznes qoidalar, validatsiya, status kodlari). Ularni **alohida bo'sh bazada** ishga tushiring:

```bash
createdb navbat_test
DATABASE_URL=postgresql://localhost/navbat_test SEED_DEMO_DATA=false npm test
```

### Muhit o'zgaruvchilari

| O'zgaruvchi | Tavsif |
|-------------|--------|
| `DATABASE_URL` | PostgreSQL ulanish satri (Vercel + Neon integratsiyasida avtomatik qo'yiladi). `POSTGRES_URL` ham qabul qilinadi |
| `SEED_DEMO_DATA` | `false` bo'lsa demo ma'lumot qo'shilmaydi |
| `DB_POOL_MAX` | Ulanishlar havzasi hajmi (standart 3) |
| `MONGODB_URI` | Ixtiyoriy. MongoDB (Atlas) ulanish satri: faollik jurnali (`/api/activity`) shu yerga yoziladi. Berilmasa jurnal o'chiq turadi, qolgan hammasi ishlayveradi |
| `MONGODB_DB` | MongoDB baza nomi (standart `navbat`) |
| `ADMIN_PASSWORD` | Registratura paneli (`/admin`) paroli. O'rnatilmasa panelga kirib bo'lmaydi |

Maxfiy ma'lumotlar kodda yozilmaydi: `.env` git'ga kirmaydi, namunasi `.env.example` faylida.

---

## API

Barcha javoblar JSON. Xato javobi doimo bir xil shaklda bo'ladi:

```json
{ "error": "Bu vaqt band. Boshqa bo'sh vaqtni tanlang" }
```

Validatsiya xatosida qaysi maydon noto'g'ri ekani ham qaytariladi:

```json
{ "error": "Telefon raqami +998 XX XXX XX XX formatida bo'lsin",
  "details": { "patientPhone": "Telefon raqami +998 XX XXX XX XX formatida bo'lsin" } }
```

Status kodlari: `200` OK, `201` yaratildi, `204` o'chirildi, `400` validatsiya, `404` topilmadi, `405` usul ruxsat etilmagan, `409` to'qnashuv (band vaqt, holat), `413` so'rov juda katta, `415` Content-Type noto'g'ri, `422` biznes qoida buzildi, `500` server xatosi.

### Shifokorlar

| Usul | Manzil | Tavsif |
|------|--------|--------|
| `GET` | `/api/doctors?search=&specialty=&active=true\|false\|all` | Ro'yxat, qidiruv va filtr |
| `GET` | `/api/doctors/:id` | Bitta shifokor |
| `POST` | `/api/doctors` | Yaratish |
| `PUT` / `PATCH` | `/api/doctors/:id` | Tahrirlash (qisman ham mumkin) |
| `DELETE` | `/api/doctors/:id` | O'chirish (qabullari bo'lmasa) |
| `GET` | `/api/doctors/:id/slots?date=YYYY-MM-DD` | Kunlik vaqt to'ri: `free`, `booked`, `past` |
| `GET` | `/api/specialties` | Mutaxassisliklar va shifokorlar soni |

### Qabullar

| Usul | Manzil | Tavsif |
|------|--------|--------|
| `GET` | `/api/appointments?doctorId=&date=&from=&to=&status=&search=&page=&limit=` | Ro'yxat: filtr, ism/telefon bo'yicha qidiruv, sahifalash |
| `GET` | `/api/appointments/:id` | Bitta qabul (shifokor va chipta raqami bilan) |
| `POST` | `/api/appointments` | Navbatga yozilish |
| `PATCH` | `/api/appointments/:id` | Tahrirlash, ko'chirish yoki holatni o'zgartirish |
| `DELETE` | `/api/appointments/:id` | O'chirish (bo'lib o'tgan qabuldan tashqari) |
| `GET` | `/api/slots/nearest?specialty=&doctorId=` | Eng yaqin bo'sh navbat |

### Boshqa

| Usul | Manzil | Tavsif |
|------|--------|--------|
| `GET` | `/api/stats` | Bugungi ko'rsatkichlar |
| `GET` | `/api/health` | Server va baza holati |

Misol:

```bash
curl -X POST https://<domen>/api/appointments \
  -H "Content-Type: application/json" \
  -d '{"doctorId":1,"patientName":"Aliyev Sherzod","patientPhone":"+998901234567","appointmentDate":"2026-12-01","startTime":"09:00"}'
```

---

## Frontend sahifalari

| Sahifa | Vazifasi |
|--------|----------|
| `/` | Eng yaqin bo'sh navbat, bugungi ko'rsatkichlar, shifokorlar katalogi (qidiruv va mutaxassislik filtri) |
| `/doctors/[id]` | Shifokor profili, 14 kunlik sana tanlash, vaqt to'ri, yozilish formasi, navbat chiptasi |
| `/appointments` | Registratura: qabullar jadvali, filtrlar, sahifalash, ko'chirish, holat belgilash |
| `/admin` | Shifokorlarni qo'shish, tahrirlash, faolsizlantirish, o'chirish |

Har bir sahifada yuklanish, xato (qayta urinish tugmasi bilan) va bo'sh holatlar bor. Interfeys telefonda ham to'liq ishlaydi: jadvallar kartochkaga aylanadi, sanalar gorizontal suriladi.

## Texnologiyalar

- **Next.js 15** (App Router), **React 19**: frontend va API route handler'lar bitta loyihada
- **PostgreSQL** (Neon) + **pg** drayveri, ORM'siz parametrlangan SQL: shifokorlar, qabullar va 12 ta biznes qoida
- **MongoDB** (ixtiyoriy): faollik jurnali, har bir yozilish/ko'chirish/bekor qilish hujjat sifatida saqlanadi
- **Zod**: serverda kiruvchi ma'lumotlarni tekshirish
- **node:test**: API avtotestlari
- **Vercel**: deploy

## Loyiha tuzilmasi

```
app/
  (frontend)/         BEMOR SAYTI (o'z header va footeri bilan)
    page.js           Bosh sahifa: tizim nima va qanday ishlatiladi (yozilish yo'q)
    shifokorlar/      Poliklinika ko'rsatkichi va shifokorlar ro'yxati
    doctors/[id]/     Vaqt tanlash, yozilish, chipta
    yonalishlar/      Yo'nalishlar va har biri uchun eng yaqin bo'sh vaqt
    chipta/           Mening chiptam: telefon orqali qabullarni topish, bekor qilish
    qanday-ishlaydi/  Qadamlar va 12 ta navbat qoidasi
  (admin)/admin/      REGISTRATURA PANELI (alohida yon menyu bilan)
    page.js           Umumiy ko'rinish: 7 kunlik yuklama, yo'nalishlar, bugungi holat
    qabullar/         Qabullar: filtr, sahifalash, ko'chirish, holat
    shifokorlar/      Shifokorlar CRUD va jadval
    tablo/            Yo'lak uchun navbat tablosi (faqat chipta raqamlari)
  api/[...path]/      Barcha /api/* so'rovlarini backend/app.js ga uzatadi
components/           UI komponentlari (chipta, holatlar, toast, SiteHeader, AdminShell)
lib/                  Frontend: API mijozi, sana va telefon formatlash
backend/              Backend (framework'dan mustaqil)
  app.js              Dispetcher: marshrutlash, xatolarni JSON ga aylantirish
  routes/             Shifokorlar, qabullar, statistika endpointlari
  services/booking.js Barcha biznes qoidalar
  validation.js       Zod sxemalari
  schema.js, seed.js  Baza sxemasi va demo ma'lumot
tests/                API avtotestlari
```
