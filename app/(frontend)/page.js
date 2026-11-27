import Link from 'next/link';

// Bosh sahifa: Navbat nima, kim uchun va qanday ishlatiladi. Yozilish bu yerda emas, /shifokorlar sahifasida.

const STEPS = [
  {
    title: 'Shifokorni toping',
    text: "Shifokorlar sahifasida poliklinika ko'rsatkichi bor: har bir shifokorning xonasi, yo'nalishi va bugungi ish vaqti. Ism yoki mutaxassislik bo'yicha qidirish mumkin",
  },
  {
    title: "Bo'sh vaqtni tanlang",
    text: "Shifokorni bosganingizda uning kunlik jadvali ochiladi. Band va o'tib ketgan vaqtlar yopiq, faqat bo'shlari bosiladi",
  },
  {
    title: 'Ism va telefonni yozing',
    text: "Ro'yxatdan o'tish, parol yoki SMS kerak emas. Telefon raqami chiptangizni keyin topish uchun kerak",
  },
  {
    title: 'Chipta bilan keling',
    text: "Chipta raqami, xona va vaqt ekranda chiqadi. Belgilangan vaqtda xona oldiga keling, tablodagi raqamingizni kuting",
  },
];

const FEATURES = [
  ["Eng yaqin bo'sh vaqt", "Yo'nalishlar sahifasi har bir mutaxassislik uchun eng yaqin bo'sh navbatni o'zi hisoblab beradi"],
  ['Chipta telefoningizda', "Mening chiptam sahifasida telefon raqamingiz bo'yicha barcha qabullaringizni ko'rasiz"],
  ["Rejangiz o'zgarsa", "Qabulni bekor qilsangiz, vaqt darhol boshqa bemorlarga ochiladi"],
  ["Ikki marta band bo'lmaydi", "Bir vaqtga faqat bitta bemor. Ikki kishi bir paytda bossa ham, server faqat bittasini yozadi"],
  ["Yo'lakda tablo", "Poliklinika ekranida har bir xonaga hozir kim kirishi chipta raqami bilan ko'rinadi. Ismingiz ko'rsatilmaydi"],
  ['Toshkent vaqti', "Barcha vaqtlar Toshkent bo'yicha. O'tib ketgan vaqtga yozilib bo'lmaydi"],
];

const FAQ = [
  ['Yozilish pullikmi?', "Yo'q. Navbat faqat qabul vaqtini band qiladi. Qabulning o'zi poliklinika qoidalari bo'yicha bo'ladi"],
  ['Qancha oldin yozilish mumkin?', "Ko'pi bilan 30 kun oldinga"],
  ["Bitta shifokorga kuniga ikki marta yozilsam bo'ladimi?", "Yo'q, bitta shifokorga bir kunda bir marta. Boshqa shifokorga shu kuni yozilish mumkin, faqat vaqtlar ustma-ust tushmasligi kerak"],
  ["Kechiksam nima bo'ladi?", "Registratura qabulni \"kelmadi\" deb belgilashi mumkin. Imkon bo'lsa, oldindan bekor qiling va yangi vaqt tanlang"],
  ["Chiptamni yo'qotib qo'ydim", "Mening chiptam sahifasiga yozilishda ko'rsatgan telefon raqamingizni kiriting. Chipta qayta chiqadi va uni chop etish mumkin"],
];

export default function HomePage() {
  return (
    <div className="landing">
      <section className="ld-hero">
        <div className="ld-hero-copy">
          <p className="hero2-kicker">Poliklinika uchun onlayn navbat</p>
          <h1>Poliklinikada navbat endi yo&apos;lakda emas, telefoningizda</h1>
          <p className="ld-lead">
            Navbat — shifokor qabuliga oldindan yozilish tizimi. Erta tongda kelib, eshik oldida soatlab turish o&apos;rniga
            uyda o&apos;tirib bo&apos;sh vaqtni tanlaysiz va aynan o&apos;sha vaqtda kelasiz
          </p>
          <div className="hero2-actions">
            <Link className="btn btn-ticket" href="/shifokorlar">Shifokorlarni ko&apos;rish <span aria-hidden="true">→</span></Link>
            <a className="btn btn-ghost" href="#qanday">Qanday ishlaydi</a>
          </div>
        </div>
        <figure className="ld-ticket" aria-label="Navbat chiptasi namunasi">
          <div className="ld-ticket-main">
            <small>Navbat chiptasi</small>
            <b>Terapevt</b>
            <dl>
              <div><dt>Sana</dt><dd>Dushanba</dd></div>
              <div><dt>Vaqt</dt><dd>09:40</dd></div>
            </dl>
          </div>
          <div className="ld-ticket-stub">
            <span className="ld-no"><small>№</small>03</span>
            <span>104-xona</span>
          </div>
          <figcaption>Yozilganingizdan keyin shunday chipta olasiz</figcaption>
        </figure>
      </section>

      <section className="ld-problem">
        <h2>Nima uchun kerak</h2>
        <div className="ld-problem-grid">
          <div>
            <b>Hozir qanday</b>
            <p>Bemor ertalab erta keladi, registraturada navbat oladi, keyin shifokor xonasi oldida yana kutadi. Qaysi shifokor qachon ishlashini bilish uchun ham poliklinikaga borish kerak</p>
          </div>
          <div>
            <b>Navbat bilan</b>
            <p>Shifokorlar jadvali internetda ochiq. Bo&apos;sh vaqtni o&apos;zingiz tanlaysiz, chipta telefoningizda qoladi. Poliklinikaga qabul vaqtiga yaqin kelasiz</p>
          </div>
        </div>
      </section>

      <section className="ld-section" id="qanday">
        <div className="ld-section-head">
          <h2>Qanday ishlatiladi</h2>
          <p className="muted">To&apos;rt qadam. Ro&apos;yxatdan o&apos;tish shart emas</p>
        </div>
        <ol className="ld-steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="ld-step-no">{String(i + 1).padStart(2, '0')}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="ld-section">
        <div className="ld-section-head">
          <h2>Chiptani qanday o&apos;qish kerak</h2>
          <p className="muted">Chiptada uchta asosiy narsa bor</p>
        </div>
        <div className="ld-read-grid">
          <div className="ld-read-item"><span className="ld-tag">№ 03</span><p><b>Chipta raqami.</b> Shu kun shu shifokorga nechanchi bo&apos;lib kirishingiz. Yo&apos;lakdagi tabloda aynan shu raqam chiqadi</p></div>
          <div className="ld-read-item"><span className="ld-tag">104-xona</span><p><b>Xona.</b> Shifokor qabul qiladigan xona. Raqamning birinchi soni — qavat</p></div>
          <div className="ld-read-item"><span className="ld-tag">09:40</span><p><b>Vaqt.</b> Qabul boshlanadigan vaqt. 5–10 daqiqa oldin kelsangiz yetarli</p></div>
        </div>
      </section>

      <section className="ld-section">
        <div className="ld-section-head">
          <h2>Nimalar qila olasiz</h2>
        </div>
        <ul className="ld-features">
          {FEATURES.map(([title, text]) => (
            <li key={title}><b>{title}</b><p>{text}</p></li>
          ))}
        </ul>
      </section>

      <section className="ld-section">
        <div className="ld-section-head">
          <h2>Ko&apos;p beriladigan savollar</h2>
        </div>
        <div className="ld-faq">
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="ld-cta">
        <div>
          <h2>Kerakli shifokorni toping</h2>
          <p>Xona raqami, ish vaqti va bo&apos;sh vaqtlar bir sahifada</p>
        </div>
        <div className="hero2-actions">
          <Link className="btn btn-ticket" href="/shifokorlar">Shifokorlar <span aria-hidden="true">→</span></Link>
          <Link className="btn ld-cta-ghost" href="/chipta">Mening chiptam</Link>
        </div>
      </section>
    </div>
  );
}
