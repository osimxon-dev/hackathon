'use client';

// Navbat tablosi: poliklinika yo'lagidagi ekran. Bemor ismi ko'rsatilmaydi, faqat chipta raqami.
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState, ErrorState, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { addDays, formatDate, nowTime, pad, relativeDay, todayISO } from '@/lib/format';

const REFRESH_MS = 30000;

function groupByDoctor(list) {
  const map = new Map();
  for (const a of list) {
    if (a.status === 'cancelled') continue;
    if (!map.has(a.doctorId)) map.set(a.doctorId, { doctor: a.doctor, items: [] });
    map.get(a.doctorId).items.push(a);
  }
  return [...map.values()]
    .map((g) => ({ ...g, items: g.items.sort((x, y) => x.startTime.localeCompare(y.startTime)) }))
    .sort((a, b) => a.doctor.room.localeCompare(b.doctor.room, undefined, { numeric: true }));
}

function BoardCell({ group }) {
  const waiting = group.items.filter((a) => a.status === 'scheduled');
  const done = group.items.filter((a) => a.status === 'completed').length;
  const [current, ...next] = waiting;
  return (
    <article className="board-cell">
      <header className="board-cell-head">
        <span className="board-room">{group.doctor.room}</span>
        <div>
          <b>{group.doctor.fullName}</b>
          <span>{group.doctor.specialty}</span>
        </div>
      </header>
      <div className="board-now">
        <span className="board-caption">{current ? 'Kiradi' : 'Navbat tugadi'}</span>
        <b className="board-number">{current ? pad(current.ticketNumber) : '—'}</b>
        {current && <span className="board-time">{current.startTime}</span>}
      </div>
      <ol className="board-next" aria-label="Keyingi chiptalar">
        {next.slice(0, 4).map((a) => (
          <li key={a.id}><b>{pad(a.ticketNumber)}</b><span>{a.startTime}</span></li>
        ))}
        {next.length === 0 && <li className="board-empty">Keyingi chipta yo&apos;q</li>}
      </ol>
      <footer className="board-foot">
        <span>{done} qabul qilindi</span>
        <span>{waiting.length} kutmoqda</span>
      </footer>
    </article>
  );
}

export default function BoardPage() {
  const today = todayISO();
  const [date, setDate] = useState(null);
  const [clock, setClock] = useState('');
  const [state, setState] = useState({ loading: true, groups: [], error: null });

  // Ochilganda qabuli bor eng yaqin kunni tanlaymiz, bo'lmasa bugun
  useEffect(() => {
    api.appointments({ from: today, to: addDays(today, 3), limit: 100 })
      .then(({ data }) => {
        const first = data.filter((a) => a.status !== 'cancelled').map((a) => a.appointmentDate).sort()[0];
        setDate(first || today);
      })
      .catch(() => setDate(today));
  }, [today]);

  const load = useCallback(async (silent = false) => {
    if (!date) return;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data } = await api.appointments({ date, limit: 100 });
      setState({ loading: false, groups: groupByDoctor(data), error: null });
    } catch (error) {
      if (!silent) setState({ loading: false, groups: [], error });
    }
  }, [date]);

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const tick = () => setClock(nowTime());
    tick();
    const timer = setInterval(tick, 10000);
    return () => clearInterval(timer);
  }, []);

  const days = [0, 1, 2, 3].map((n) => addDays(today, n));
  const { loading, groups, error } = state;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Navbat tablosi</h1>
          <p>Yo&apos;lakdagi ekran uchun: har bir xonada hozir kim kiradi va keyingi chiptalar. Bemor ismi ko&apos;rsatilmaydi, faqat chipta raqami. Har 30 soniyada yangilanadi</p>
        </div>
        <div className="segmented" role="group" aria-label="Kun">
          {days.map((d) => (
            <button key={d} type="button" aria-pressed={d === date} onClick={() => setDate(d)}>
              {relativeDay(d) === formatDate(d) ? formatDate(d, false) : relativeDay(d)}
            </button>
          ))}
        </div>
      </div>

      <section className="board" aria-live="polite">
        <header className="board-head">
          <div>
            <span className="board-caption">Navbat · {date ? formatDate(date) : ''}</span>
            <p className="board-title">Chipta raqamingizni kuting</p>
          </div>
          {date === today && <time className="board-clock" aria-label="Hozirgi vaqt">{clock}</time>}
        </header>

        {loading && <div className="board-state"><Loading text="Tablo yuklanmoqda" /></div>}
        {error && <div className="board-state"><ErrorState error={error} onRetry={() => load()} /></div>}
        {!loading && !error && groups.length === 0 && (
          <div className="board-state">
            <EmptyState title="Bu kunga qabullar yo'q" text="Boshqa kunni tanlang yoki bemorni qabulga yozing.">
              <Link className="btn btn-ticket btn-sm" href="/">Qabulga yozish</Link>
            </EmptyState>
          </div>
        )}
        {!loading && !error && groups.length > 0 && (
          <div className="board-grid">
            {groups.map((g) => <BoardCell key={g.doctor.id} group={g} />)}
          </div>
        )}
      </section>
    </>
  );
}
