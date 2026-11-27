'use client';

// Statistika: bugungi holatlar, keyingi 7 kunlik yuklama va yo'nalishlar bo'yicha qabullar.
import { useCallback, useEffect, useState } from 'react';
import { ErrorState, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { addDays, formatDate, todayISO, WEEKDAYS_SHORT, weekdayIndex } from '@/lib/format';

const STATUS_PARTS = [
  ['completed', "Bo'ldi", 'var(--ok)'],
  ['scheduled', 'Kutilmoqda', 'var(--ticket-deep)'],
  ['noShow', 'Kelmadi', 'var(--alert)'],
  ['cancelled', 'Bekor qilingan', 'var(--off)'],
];

export default function StatsPage() {
  const [state, setState] = useState({ loading: true, stats: null, week: [], error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const today = todayISO();
      const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
      const [{ data: stats }, { data: list }] = await Promise.all([
        api.stats(),
        api.appointments({ from: days[0], to: days[6], limit: 100 }),
      ]);
      const week = days.map((d) => ({
        date: d,
        count: list.filter((a) => a.appointmentDate === d && a.status !== 'cancelled').length,
      }));
      setState({ loading: false, stats, week, error: null });
    } catch (error) {
      setState({ loading: false, stats: null, week: [], error });
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const { loading, stats, week, error } = state;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Umumiy ko&apos;rinish</h1>
          <p>Poliklinika yuklamasi: bugungi qabullar, keyingi 7 kun va qaysi yo&apos;nalishga talab ko&apos;proq</p>
        </div>
      </div>

      {loading && !stats && <Loading text="Statistika yuklanmoqda" />}
      {error && <ErrorState error={error} onRetry={load} />}
      {stats && <StatsBody stats={stats} week={week} />}
      <ActivityLog />
    </>
  );
}

function StatsBody({ stats, week }) {
  const t = stats.today;
  const max = Math.max(1, ...week.map((w) => w.count));
  const peak = week.reduce((a, b) => (b.count > a.count ? b : a), week[0]);
  const specMax = Math.max(1, ...stats.bySpecialty.map((s) => s.appointments));
  const total = STATUS_PARTS.reduce((sum, [key]) => sum + (t[key] || 0), 0);

  return (
    <div className="stats-layout">
      <section className="figures" aria-label="Asosiy ko'rsatkichlar">
        <div className="figure"><b>{t.total}</b><span>Bugungi qabullar</span></div>
        <div className="figure"><b>{t.completed}</b><span>Bugun qabul qilindi</span></div>
        <div className="figure"><b>{stats.upcoming}</b><span>Kutilayotgan qabullar</span></div>
        <div className="figure"><b>{stats.activeDoctors}</b><span>Faol shifokorlar</span></div>
      </section>

      <div className="stats-grid">
        <section className="panel chart-panel">
          <div className="chart-head">
            <h2>Keyingi 7 kun</h2>
            <p className="muted small">
              {peak.count > 0 ? `Eng band kun: ${formatDate(peak.date)}, ${peak.count} ta qabul` : "Keyingi 7 kunga hali qabul yo'q"}
            </p>
          </div>
          <div className="week-chart" role="img" aria-label={week.map((w) => `${formatDate(w.date, false)}: ${w.count}`).join(', ')}>
            {week.map((w) => (
              <div key={w.date} className={`week-bar ${w.date === peak.date && peak.count > 0 ? 'is-peak' : ''}`}>
                <span className="week-value">{w.count}</span>
                <span className="week-track"><i style={{ height: `${(w.count / max) * 100}%` }} /></span>
                <span className="week-label">{WEEKDAYS_SHORT[weekdayIndex(w.date) - 1]}<small>{w.date.slice(8)}</small></span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Yo&apos;nalishlar bo&apos;yicha</h2>
          <p className="muted small" style={{ margin: '.25rem 0 1rem' }}>Kutilayotgan qabullar soni</p>
          <ol className="rank">
            {stats.bySpecialty.map((s, i) => (
              <li key={s.specialty} className={i === 0 && s.appointments > 0 ? 'is-top' : ''}>
                <span>{s.specialty}</span>
                <b>{s.appointments}</b>
                <span className="rank-track"><i style={{ width: `${(s.appointments / specMax) * 100}%` }} /></span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="panel">
        <h2>Bugungi qabullar holati</h2>
        {total === 0 ? (
          <p className="muted" style={{ margin: '.5rem 0 0' }}>Bugunga qabullar yo&apos;q</p>
        ) : (
          <>
            <div className="stack-bar" role="img" aria-label={STATUS_PARTS.map(([k, label]) => `${label}: ${t[k] || 0}`).join(', ')}>
              {STATUS_PARTS.map(([key, , color]) => (t[key] ? <i key={key} style={{ flexGrow: t[key], background: color }} /> : null))}
            </div>
            <ul className="stack-legend">
              {STATUS_PARTS.map(([key, label, color]) => (
                <li key={key}><i style={{ background: color }} />{label}<b>{t[key] || 0}</b></li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

const EVENT_LABELS = {
  'appointment.created': 'Yangi qabul',
  'appointment.moved': "Qabul ko'chirildi",
  'appointment.edited': 'Qabul tahrirlandi',
  'appointment.completed': "Qabul bo'ldi",
  'appointment.cancelled': 'Qabul bekor qilindi',
  'appointment.no_show': 'Bemor kelmadi',
  'appointment.deleted': "Qabul o'chirildi",
  'doctor.created': "Shifokor qo'shildi",
  'doctor.updated': 'Shifokor tahrirlandi',
  'doctor.deleted': "Shifokor o'chirildi",
};

/* Faollik jurnali — MongoDB'dan o'qiladi */
function ActivityLog() {
  const [state, setState] = useState({ loading: true, data: [], enabled: true, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data, meta } = await api.activity({ limit: 20 });
      setState({ loading: false, data, enabled: meta.enabled, error: null });
    } catch (error) {
      setState({ loading: false, data: [], enabled: true, error });
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const { loading, data, enabled, error } = state;

  return (
    <section className="panel activity" style={{ marginTop: '1.5rem' }}>
      <div className="activity-head">
        <div>
          <h2>Faollik jurnali</h2>
          <p className="muted small">Har bir yozilish, ko&apos;chirish va holat o&apos;zgarishi MongoDB&apos;da hujjat sifatida saqlanadi</p>
        </div>
        <span className="activity-badge">MongoDB</span>
      </div>
      {loading && <Loading text="Jurnal yuklanmoqda" />}
      {error && <ErrorState error={error} onRetry={load} />}
      {!loading && !error && !enabled && (
        <p className="muted" style={{ margin: 0 }}>Jurnal o&apos;chiq: serverda MONGODB_URI o&apos;rnatilmagan</p>
      )}
      {!loading && !error && enabled && data.length === 0 && (
        <p className="muted" style={{ margin: 0 }}>Hali hodisa yo&apos;q. Qabulga yozilish yoki holat o&apos;zgarishi shu yerda chiqadi</p>
      )}
      {!loading && data.length > 0 && (
        <ol className="activity-list">
          {data.map((e) => (
            <li key={e.id}>
              <time>{new Date(e.at).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</time>
              <b className={`ev ev-${e.type.split('.')[1]}`}>{EVENT_LABELS[e.type] || e.type}</b>
              <span>
                {e.doctorName || `Shifokor #${e.doctorId}`}
                {e.date && ` · ${e.date} ${e.time}`}
                {e.ticketNumber && ` · № ${String(e.ticketNumber).padStart(2, '0')}`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
