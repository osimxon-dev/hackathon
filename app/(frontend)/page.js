'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState, ErrorState, Loading, SearchIcon, WeekStrip } from '@/components/ui';
import { api } from '@/lib/api';
import { initials, nowTime, pad, relativeDay } from '@/lib/format';

/* ---------- Tezkor yozilish: mutaxassislik -> bo'sh vaqt -> yozilish ---------- */
function QuickBook({ specialties }) {
  const [specialty, setSpecialty] = useState('');
  const [state, setState] = useState({ loading: true, slot: null, times: [], error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data } = await api.nearest({ specialty });
      if (!data) {
        setState({ loading: false, slot: null, times: [], error: null });
        return;
      }
      const { data: day } = await api.doctorSlots(data.doctor.id, data.date);
      const times = day.slots.filter((t) => t.status === 'free').slice(0, 6);
      setState({ loading: false, slot: data, times, error: null });
    } catch (error) {
      setState({ loading: false, slot: null, times: [], error });
    }
  }, [specialty]);

  useEffect(() => { load(); }, [load]);
  const { loading, slot, times, error } = state;

  return (
    <div className="qb">
      <p className="qb-step"><span className="qb-n">1</span>Kim kerak?</p>
      <div className="qb-chips" role="group" aria-label="Mutaxassislik">
        {[{ name: '' }, ...specialties].map((s) => (
          <button key={s.name || 'all'} type="button" className="qb-chip" aria-pressed={specialty === s.name} onClick={() => setSpecialty(s.name)}>
            {s.name || 'Istalgan'}
          </button>
        ))}
      </div>

      <p className="qb-step"><span className="qb-n">2</span>Vaqtni bosing</p>
      <div className="qb-result" aria-live="polite" aria-busy={loading || undefined}>
        {loading && (
          <div className="qb-times">
            {Array.from({ length: 6 }, (_, i) => <span key={i} className="qb-time skeleton" />)}
          </div>
        )}
        {error && <ErrorState error={error} onRetry={load} />}
        {!loading && !error && !slot && (
          <p className="qb-empty">Yaqin 14 kunda bo&apos;sh vaqt topilmadi. Boshqa mutaxassisni tanlang</p>
        )}
        {!loading && slot && (
          <>
            <Link className="qb-doctor" href={`/doctors/${slot.doctor.id}?date=${slot.date}`}>
              <span className="avatar" aria-hidden="true">{initials(slot.doctor.fullName)}</span>
              <span className="qb-doctor-text">
                <b>{slot.doctor.fullName}</b>
                <span>{slot.doctor.specialty} · {slot.doctor.room}-xona · {relativeDay(slot.date)}</span>
              </span>
              <span className="qb-arrow" aria-hidden="true">→</span>
            </Link>
            <div className="qb-times">
              {times.map((t, i) => (
                <Link key={t.time} className={`qb-time ${i === 0 ? 'is-first' : ''}`} style={{ '--i': i }}
                  href={`/doctors/${slot.doctor.id}?date=${slot.date}&time=${t.time}`}>
                  <b>{t.time}</b>
                  <span>{i === 0 ? 'eng yaqin' : `№ ${pad(t.ticketNumber)}`}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
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
          <p className="hero-lead">Poliklinika yo&apos;lagida soatlab kutish shart emas. Mutaxassisni tanlang, bo&apos;sh vaqtni bosing, chiptangiz telefoningizda bo&apos;ladi</p>
          <div className="hero-actions">
            <a className="btn btn-ticket" href="#doctors-title">Barcha shifokorlar</a>
            <Link className="btn hero-ghost" href="/chipta">Mening chiptam</Link>
          </div>
        </div>
        <QuickBook specialties={specialties} />
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
