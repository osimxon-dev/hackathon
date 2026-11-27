import Link from 'next/link';

export const metadata = { title: 'Qanday ishlaydi' };

const STEPS = [
  ['Shifokorni tanlang', "Ro'yxatdan yoki yo'nalish bo'yicha. Eng yaqin bo'sh vaqtni tizim o'zi topib beradi"],
  ["Bo'sh vaqtni bosing", "Kunlik vaqt to'rida band va o'tgan vaqtlar yopiq. Ism va telefonni yozasiz, boshqa hech narsa kerak emas"],
  ['Chiptani oling', 'Chipta raqami, xona va vaqt ekranda chiqadi. Poliklinikada tablodagi raqamingizni kutasiz'],
];

const RULES = [
  ['Bir vaqtga bitta bemor', 'Shifokorning bitta vaqtiga faqat bitta faol qabul. Ikki kishi bir paytda bossa ham, bittasi yoziladi'],
  ['Bir paytda ikki joyda emas', "Bemor bir vaqtning o'zida ikki shifokor qabulida bo'la olmaydi"],
  ['Kuniga bir marta', 'Bitta shifokorga bir kunda faqat bir marta yoziladi'],
  ["O'tgan vaqt yopiq", "O'tib ketgan vaqtga yozilib bo'lmaydi. Vaqt Toshkent bo'yicha hisoblanadi"],
  ['30 kun oldinga', "Ko'pi bilan 30 kun oldinga yozilish mumkin"],
  ['Faqat ish vaqtida', 'Shifokorning ish kuni, ish soatlari va qabul qadamiga mos vaqtgagina'],
  ['Faol shifokorlar', "Hozir qabul qilmayotgan shifokorga yozilib bo'lmaydi"],
  ['Holatlar oqimi', "Kutilmoqda → bo'ldi, bekor qilingan yoki kelmadi. Yakuniy holat o'zgarmaydi"],
  ['Vaqtidan oldin belgilanmaydi', "Vaqti kelmagan qabulni \"bo'ldi\" yoki \"kelmadi\" deb belgilab bo'lmaydi"],
  ['Tibbiy tarix saqlanadi', "Bo'lib o'tgan qabul o'chirilmaydi"],
  ["Shifokor o'chirilmaydi", "Qabuli yoki tarixi bor shifokor o'chirilmaydi, faolsizlantiriladi"],
  ['Jadval qabullarni buzmaydi', "Jadvalni mavjud qabullar sig'maydigan qilib o'zgartirib bo'lmaydi"],
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="how-hero">
        <h1>Navbat qog&apos;oz chiptadan telefonga ko&apos;chdi</h1>
        <p className="lead">Poliklinikada erta kelib, yo&apos;lakda soatlab kutish shart emas. Uch qadam, va vaqtingiz band</p>
      </section>

      <ol className="steps">
        {STEPS.map(([title, text], i) => (
          <li key={title} className="step">
            <span className="step-no" aria-hidden="true"><small>№</small>{String(i + 1).padStart(2, '0')}</span>
            <h2>{title}</h2>
            <p>{text}</p>
          </li>
        ))}
      </ol>

      <div className="how-cta">
        <Link className="btn btn-ticket" href="/">Shifokor tanlash</Link>
        <Link className="btn btn-ghost" href="/chipta">Chiptamni topish</Link>
      </div>

      <section className="rules">
        <div className="rules-head">
          <h2>Navbat qoidalari</h2>
          <p className="muted">Har bir qoida serverda tekshiriladi. Interfeysni chetlab o&apos;tib ham ularni buzib bo&apos;lmaydi</p>
        </div>
        <ol className="rules-list">
          {RULES.map(([title, text], i) => (
            <li key={title}>
              <span className="rule-no">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <b>{title}</b>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="roles">
        <div className="role">
          <h2>Bemor uchun</h2>
          <p>Shifokor tanlash, bo&apos;sh vaqtga yozilish, chiptani telefon raqami orqali topish va kerak bo&apos;lsa bekor qilish</p>
          <Link href="/yonalishlar">Yo&apos;nalishlar</Link>
        </div>
        <div className="role">
          <h2>Registratura uchun</h2>
          <p>Qabullarni qidirish, ko&apos;chirish, holatini belgilash, yo&apos;lak uchun navbat tablosi va kunlik statistika</p>
          <Link href="/admin/qabullar">Qabullar</Link>
        </div>
        <div className="role">
          <h2>Bosh shifokor uchun</h2>
          <p>Shifokorlar jadvali: ish kunlari, soatlar, qabul davomiyligi. Jadval o&apos;zgarsa, mavjud qabullar tekshiriladi</p>
          <Link href="/admin/shifokorlar">Shifokorlar jadvali</Link>
        </div>
      </section>
    </>
  );
}
