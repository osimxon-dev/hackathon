'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyState, ErrorState, Loading, SearchIcon, WeekStrip } from '@/components/ui';
import { api } from '@/lib/api';
import { initials, todayISO, weekdayIndex } from '@/lib/format';

/* ---------- Hero: poliklinika ko'rsatkich taxtasi (haqiqiy shifokorlar, xona raqamlari) ---------- */
function Hero({ specialties }) {
  const [doctors, setDoctors] = useState(null);
  const weekday = weekdayIndex(todayISO());

  useEffect(() => {
    api.doctors({ active: 'true' })
      .then(({ data }) => setDoctors([...data].sort((x, y) => x.room.localeCompare(y.room, undefined, { numeric: true }))))
      .catch(() => setDoctors([]));
  }, []);

  const working = doctors ? doctors.filter((d) => d.workDays.includes(weekday)).length : null;

  return (
    <section className="hero2">
      <div className="hero2-copy">
        <p className="hero2-kicker">Poliklinika ko&apos;rsatkichi</p>
        <h1>Shifokorlar va xonalar</h1>
        <p className="hero2-lead">Kerakli shifokorni toping: xona raqami, bugungi ish vaqti va jadvali shu yerda. Shifokorni bosing va bo&apos;sh vaqtni tanlang</p>
        <div className="hero2-actions">
          <a className="btn btn-ticket" href="#doctors-title">Ro&apos;yxatga o&apos;tish <span aria-hidden="true">→</span></a>
          <Link className="btn btn-ghost" href="/chipta">Mening chiptam</Link>
        </div>
        <dl className="hero2-facts">
          <div><dt>Shifokorlar</dt><dd>{doctors ? doctors.length : '—'}</dd></div>
          <div><dt>Yo&apos;nalishlar</dt><dd>{specialties.length || '—'}</dd></div>
          <div><dt>Bugun ishlaydi</dt><dd>{working ?? '—'}</dd></div>
        </dl>
      </div>

      <nav className="directory" aria-label="Poliklinika ko'rsatkichi">
        <div className="directory-head">
          <span>Xona</span><span>Yo&apos;nalish va shifokor</span><span>Bugun</span>
        </div>
        {!doctors && Array.from({ length: 6 }, (_, i) => <span key={i} className="dir-row skeleton-row" />)}
        {doctors && doctors.map((d, i) => {
          const works = d.workDays.includes(weekday);
          return (
            <Link key={d.id} className="dir-row" href={`/doctors/${d.id}`} style={{ '--i': i }}>
              <span className="dir-room">{d.room}</span>
              <span className="dir-name"><b>{d.specialty}</b><small>{d.fullName}</small></span>
              <span className={`dir-time ${works ? '' : 'is-off'}`}>{works ? `${d.workStart}–${d.workEnd}` : 'Dam olish'}</span>
              <span className="dir-arrow" aria-hidden="true">→</span>
            </Link>
          );
        })}
        {doctors && doctors.length === 0 && <p className="dir-empty">Hozircha faol shifokorlar yo&apos;q</p>}
      </nav>
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
