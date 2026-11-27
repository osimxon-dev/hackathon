'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyState, ErrorState, Loading, SearchIcon, WeekStrip } from '@/components/ui';
import { api } from '@/lib/api';
import { initials, nowTime, pad } from '@/lib/format';

/* ---------- Hero ko'rgazmasi: 3 qadam o'zi almashadi, bosish ham mumkin (yozilish emas) ---------- */
const HOW = [
  { title: 'Shifokorni tanlang', text: "Ro'yxatdan yoki yo'nalish bo'yicha tanlaysiz" },
  { title: "Bo'sh vaqtni bosing", text: "Band va o'tgan vaqtlar yopiq, faqat bo'shlari bosiladi" },
  { title: 'Chiptani oling', text: 'Raqam, xona va vaqt telefoningizda qoladi' },
];
const DEMO_TIMES = ['09:00', '09:20', '09:40', '10:00', '10:20', '10:40'];

function HowSteps({ specialties }) {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => setStep((n) => (n + 1) % HOW.length), 3500);
    return () => clearInterval(timer);
  }, [paused, step]);
  const names = specialties.length ? specialties.slice(0, 3).map((s) => s.name) : ['Terapevt', 'Kardiolog', 'Pediatr'];

  return (
    <div className="hs" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-label="Qanday ishlaydi">
      <div className="hs-tabs" role="tablist">
        {HOW.map((h, i) => (
          <button key={h.title} type="button" role="tab" aria-selected={i === step} className="hs-tab" onClick={() => setStep(i)}>
            <span className="qb-n">{i + 1}</span>
            <b>{h.title}</b>
            {i === step && <i className={`hs-progress ${paused ? 'is-paused' : ''}`} />}
          </button>
        ))}
      </div>
      <div className="hs-stage" key={step} aria-hidden="true">
        {step === 0 && (
          <ul className="hs-list">
            {names.map((n, i) => (
              <li key={n} className={i === 0 ? 'is-on' : ''} style={{ '--i': i }}>
                <span className="avatar">{n.slice(0, 2).toUpperCase()}</span>
                <span><b>{n}</b><small>Mutaxassis</small></span>
                <span className="hs-go">→</span>
              </li>
            ))}
          </ul>
        )}
        {step === 1 && (
          <div className="qb-times">
            {DEMO_TIMES.map((t, i) => {
              const off = i === 1 || i === 4;
              return (
                <span key={t} className={`qb-time ${i === 2 ? 'is-first' : ''} ${off ? 'is-off' : ''}`} style={{ '--i': i }}>
                  <b>{t}</b><span>{i === 2 ? 'tanlandi' : off ? 'band' : `№ ${pad(i + 1)}`}</span>
                </span>
              );
            })}
          </div>
        )}
        {step === 2 && (
          <div className="hs-ticket">
            <div><small>Navbat chiptasi</small><b>{names[0]}</b><span>Bugun, 09:40</span></div>
            <div className="hs-stub"><b><small>№</small>03</b><span>xona raqami</span></div>
          </div>
        )}
      </div>
      <p className="hs-caption">{HOW[step].text}</p>
    </div>
  );
}

/* ---------- Hero: kursor ortidan yuradigan yorug'lik ---------- */
function Hero({ specialties }) {
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => setClock(nowTime());
    tick();
    const timer = setInterval(tick, 10000);
    return () => clearInterval(timer);
  }, []);
  const doctors = specialties.reduce((sum, s) => sum + s.doctors, 0);
  const track = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <section className="hero-x" onMouseMove={track}>
      <div className="hero-x-inner">
        <div className="hero-copy">
          <p className="hero-live"><i aria-hidden="true" />Toshkent vaqti {clock}{doctors > 0 && ` · ${doctors} shifokor jadvalda`}</p>
          <h1>Shifokorga navbatni <span className="hl">uydan</span> oling</h1>
          <p className="hero-lead">Poliklinika yo&apos;lagida soatlab kutish shart emas. Shifokorni tanlang, uning jadvalidan bo&apos;sh vaqtni band qiling, chiptangiz telefoningizda bo&apos;ladi</p>
          <div className="hero-actions">
            <a className="btn btn-ticket" href="#doctors-title">Shifokor tanlash</a>
            <Link className="btn hero-ghost" href="/chipta">Mening chiptam</Link>
          </div>
        </div>
        <HowSteps specialties={specialties} />
      </div>
    </section>
  );
}

/* ---------- Bugungi ko'rsatkichlar ---------- */
function Figures() {
  const [stats, setStats] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.stats().then(({ data }) => setStats(data)).catch(() => setFailed(true));
  }, []);

  const items = [
    ['Bugungi qabullar', stats?.today.total],
    ['Kutilayotgan qabullar', stats?.upcoming],
    ['Bugun qabul qilindi', stats?.today.completed],
    ['Faol shifokorlar', stats?.activeDoctors],
  ];
  return (
    <section className="figures" aria-label="Bugungi ko'rsatkichlar">
      {items.map(([label, value]) => (
        <div className="figure" key={label}>
          {stats || failed ? <b>{failed ? '—' : value}</b> : <b className="skeleton">&nbsp;</b>}
          <span>{label}</span>
        </div>
      ))}
    </section>
  );
}

/* ---------- Shifokorlar katalogi ---------- */
function DoctorRow({ doctor: d }) {
  return (
    <li className="doctor-row">
      <div className="avatar" aria-hidden="true">{initials(d.fullName)}</div>
      <div>
        <h3>{d.fullName}</h3>
        <div className="meta">{d.specialty}, {d.experienceYears} yil tajriba, {d.room}-xona</div>
        {!d.isActive && <span className="pill pill-inactive" style={{ marginTop: '.3rem' }}>Hozir qabul qilmaydi</span>}
      </div>
      <div>
        <div className="small muted">{d.workStart}–{d.workEnd}, har {d.slotMinutes} daqiqa</div>
        <WeekStrip workDays={d.workDays} />
      </div>
      <div>
        <Link className={`btn btn-sm ${d.isActive ? 'btn-ticket' : 'btn-ghost'}`} href={`/doctors/${d.id}`}>
          {d.isActive ? 'Vaqt tanlash' : 'Batafsil'}
        </Link>
      </div>
    </li>
  );
}

export default function HomePage() {
  const [specialties, setSpecialties] = useState([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [state, setState] = useState({ loading: true, doctors: [], error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    api.specialties().then(({ data }) => setSpecialties(data)).catch(() => setSpecialties([]));
  }, []);

  // Qidiruvni har harfda emas, 300 ms to'xtalishdan keyin yuboramiz
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    api.doctors({ search: query, specialty })
      .then(({ data }) => { if (!cancelled) setState({ loading: false, doctors: data, error: null }); })
      .catch((error) => { if (!cancelled) setState({ loading: false, doctors: [], error }); });
    return () => { cancelled = true; };
  }, [query, specialty, reloadKey]);

  const filtered = Boolean(query || specialty);
  const resetFilters = () => { setSearch(''); setQuery(''); setSpecialty(''); };

  return (
    <>
      <Hero specialties={specialties} />

      <Figures />

      <section aria-labelledby="doctors-title">
        <div className="page-head">
          <div>
            <h2 id="doctors-title">Shifokorlar</h2>
            <p>Shifokorni tanlang va uning kunlik jadvalidan bo&apos;sh vaqtni band qiling.</p>
          </div>
        </div>

        <div className="toolbar">
          <label className="search">
            <span className="sr-only">Shifokor yoki mutaxassislik bo&apos;yicha qidirish</span>
            <SearchIcon />
            <input
              className="input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ism yoki mutaxassislik, masalan: kardiolog"
              autoComplete="off"
            />
          </label>
          <div className="chips" role="group" aria-label="Mutaxassislik bo'yicha filtr">
            {[{ name: '' }, ...specialties].map((s) => (
              <button
                key={s.name || 'all'}
                type="button"
                className="chip"
                aria-pressed={specialty === s.name}
                onClick={() => setSpecialty(s.name)}
              >
                {s.name || 'Hammasi'}
              </button>
            ))}
          </div>
        </div>

        {state.loading && <Loading text="Shifokorlar yuklanmoqda" />}
        {!state.loading && state.error && <ErrorState error={state.error} onRetry={() => setReloadKey((k) => k + 1)} />}
        {!state.loading && !state.error && state.doctors.length === 0 && (
          <EmptyState
            title="Shifokor topilmadi"
            text={filtered ? "Qidiruv so'zini o'zgartiring yoki filtrni olib tashlang." : "Hozircha shifokorlar qo'shilmagan."}
          >
            {filtered
              ? <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>Filtrni tozalash</button>
              : <Link className="btn btn-primary btn-sm" href="/yonalishlar">Yo&apos;nalishlar</Link>}
          </EmptyState>
        )}
        {!state.loading && !state.error && state.doctors.length > 0 && (
          <ul className="doctor-list">
            {state.doctors.map((d) => <DoctorRow key={d.id} doctor={d} />)}
          </ul>
        )}
      </section>
    </>
  );
}
