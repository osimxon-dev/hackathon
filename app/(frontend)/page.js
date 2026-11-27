'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Ticket from '@/components/Ticket';
import { EmptyState, ErrorState, Loading, SearchIcon, WeekStrip } from '@/components/ui';
import { api } from '@/lib/api';
import { initials, relativeDay } from '@/lib/format';

/* ---------- Eng yaqin bo'sh navbat (innovatsion funksiya) ---------- */
function NearestFinder({ specialties }) {
  const [specialty, setSpecialty] = useState('');
  const [state, setState] = useState({ loading: true, data: null, error: null });

  const load = useCallback(async () => {
    setState({ loading: true, data: null, error: null });
    try {
      const { data } = await api.nearest({ specialty });
      setState({ loading: false, data, error: null });
    } catch (error) {
      setState({ loading: false, data: null, error });
    }
  }, [specialty]);

  useEffect(() => { load(); }, [load]);

  const { loading, data, error } = state;
  return (
    <div className="finder">
      <div className="finder-controls">
        <div className="field">
          <label htmlFor="finder-specialty">Qaysi mutaxassis kerak?</label>
          <select id="finder-specialty" className="input" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
            <option value="">Istalgan mutaxassis</option>
            {specialties.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div aria-live="polite">
        {loading && (
          <Ticket loading>
            <div className="skeleton" style={{ height: '1.4em', width: '70%' }} />
            <div className="skeleton" style={{ height: '1em', width: '50%' }} />
            <div className="skeleton" style={{ height: '2.6em', width: '60%' }} />
          </Ticket>
        )}
        {error && <ErrorState error={error} onRetry={load} />}
        {!loading && !error && !data && (
          <Ticket number={0}>
            <p className="ticket-title">Yaqin 14 kunda bo&apos;sh vaqt topilmadi</p>
            <p className="muted" style={{ margin: 0 }}>Boshqa mutaxassisni tanlang yoki keyinroq qayta tekshiring.</p>
          </Ticket>
        )}
        {!loading && data && (
          <Ticket number={data.ticketNumber} room={data.doctor.room} className="reveal">
            <p className="muted small" style={{ margin: 0 }}>Eng yaqin bo&apos;sh navbat</p>
            <p className="ticket-title" style={{ margin: 0 }}>{data.doctor.fullName}</p>
            <dl className="ticket-row" style={{ margin: 0 }}>
              <div><dt>Mutaxassislik</dt><dd>{data.doctor.specialty}</dd></div>
              <div><dt>Kun</dt><dd>{relativeDay(data.date)}</dd></div>
              <div><dt>Vaqt</dt><dd>{data.time}</dd></div>
            </dl>
            <div>
              <Link className="btn btn-primary" href={`/doctors/${data.doctor.id}?date=${data.date}&time=${data.time}`}>
                Shu vaqtga yozilish
              </Link>
            </div>
          </Ticket>
        )}
      </div>
    </div>
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
      <section className="hero">
        <div>
          <h1>Shifokorga navbatni uydan oling</h1>
          <p className="lead">Poliklinika yo&apos;lagida soatlab kutish shart emas. Bo&apos;sh vaqtni tanlang, chiptangiz telefoningizda bo&apos;ladi.</p>
        </div>
        <NearestFinder specialties={specialties} />
      </section>

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
              : <Link className="btn btn-primary btn-sm" href="/admin/shifokorlar">Shifokor qo&apos;shish</Link>}
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
