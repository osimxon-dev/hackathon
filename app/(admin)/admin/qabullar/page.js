'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/Toast';
import { EmptyState, ErrorState, Loading, StatusPill } from '@/components/ui';
import { api } from '@/lib/api';
import { addDays, formatPhone, isPast, pad, relativeDay, todayISO } from '@/lib/format';

const LIMIT = 15;
const EMPTY_FILTERS = { search: '', doctorId: '', date: '', status: 'all' };
const CONFIRM = {
  cancelled: "Qabul bekor qilinsinmi? Vaqt boshqa bemorlar uchun bo'shaydi.",
  delete: "Qabul butunlay o'chirilsinmi? Bu amalni qaytarib bo'lmaydi.",
};
const DONE = {
  completed: "Qabul bo'lib o'tgan deb belgilandi",
  no_show: 'Bemor kelmagan deb belgilandi',
  cancelled: 'Qabul bekor qilindi',
  delete: "Qabul o'chirildi",
};

function RowActions({ appointment: a, busy, onAction }) {
  if (a.status === 'completed') return null;
  if (a.status !== 'scheduled') {
    return <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => onAction('delete', a)}>O&apos;chirish</button>;
  }
  const past = isPast(a.appointmentDate, a.startTime);
  return (
    <>
      {past ? (
        <>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => onAction('completed', a)}>Bo&apos;ldi</button>
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onAction('no_show', a)}>Kelmadi</button>
        </>
      ) : (
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onAction('move', a)}>Ko&apos;chirish</button>
      )}
      <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => onAction('cancelled', a)}>Bekor qilish</button>
    </>
  );
}

function MoveDialog({ appointment, onClose, onMoved }) {
  const ref = useRef(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [options, setOptions] = useState({ state: 'idle', slots: [], message: 'Avval sanani tanlang' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (appointment) {
      setDate(''); setTime(''); setError('');
      setOptions({ state: 'idle', slots: [], message: 'Avval sanani tanlang' });
      ref.current?.showModal();
    } else {
      ref.current?.close();
    }
  }, [appointment]);

  useEffect(() => {
    if (!appointment || !date) return;
    let cancelled = false;
    setOptions({ state: 'loading', slots: [], message: 'Yuklanmoqda' });
    api.doctorSlots(appointment.doctorId, date)
      .then(({ data }) => {
        if (cancelled) return;
        const free = data.slots.filter((s) => s.status === 'free');
        const message = !data.workingDay ? 'Shifokor bu kuni ishlamaydi' : free.length ? '' : "Bo'sh vaqt yo'q";
        setOptions({ state: 'ready', slots: free, message });
        setTime(free[0]?.time || '');
      })
      .catch((err) => { if (!cancelled) setOptions({ state: 'error', slots: [], message: err.message }); });
    return () => { cancelled = true; };
  }, [appointment, date]);

  async function submit(e) {
    e.preventDefault();
    if (!date || !time) {
      setError("Sana va bo'sh vaqtni tanlang");
      return;
    }
    setBusy(true);
    try {
      await api.updateAppointment(appointment.id, { appointmentDate: date, startTime: time });
      onMoved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="move-title">
      {appointment && (
        <form onSubmit={submit} noValidate>
          <div className="dialog-body">
            <h2 id="move-title">Qabulni ko&apos;chirish</h2>
            <p className="muted small" style={{ margin: 0 }}>
              {appointment.patientName}, {appointment.doctor.fullName}. Hozir: {relativeDay(appointment.appointmentDate)}, {appointment.startTime}
            </p>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="move-date">Yangi sana</label>
                <input id="move-date" className="input" type="date" value={date} min={todayISO()} max={addDays(todayISO(), 30)}
                  onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="move-time">Bo&apos;sh vaqt</label>
                <select id="move-time" className="input" value={time} onChange={(e) => setTime(e.target.value)} disabled={!options.slots.length}>
                  {options.slots.length === 0 && <option value="">{options.message}</option>}
                  {options.slots.map((s) => <option key={s.time} value={s.time}>{s.time} (№ {pad(s.ticketNumber)})</option>)}
                </select>
              </div>
            </div>
            {error && <p className="notice" role="alert">{error}</p>}
          </div>
          <div className="dialog-actions">
            <button className="btn btn-ghost" type="button" onClick={onClose}>Yopish</button>
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Ko'chirilmoqda" : "Ko'chirish"}</button>
          </div>
        </form>
      )}
    </dialog>
  );
}

export default function AppointmentsPage() {
  const toast = useToast();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [doctors, setDoctors] = useState([]);
  const [state, setState] = useState({ loading: true, items: [], meta: null, error: null });
  const [busyId, setBusyId] = useState(null);
  const [moving, setMoving] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // "Mening qabullarim" havolasidan kelgan qidiruv
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get('search');
    if (initial) {
      setSearch(initial);
      setFilters((f) => ({ ...f, search: initial }));
    }
    api.doctors().then(({ data }) => setDoctors(data)).catch(() => setDoctors([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => (f.search === search.trim() ? f : { ...f, search: search.trim() }));
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    api.appointments({ ...filters, page, limit: LIMIT })
      .then(({ data, meta }) => { if (!cancelled) setState({ loading: false, items: data, meta, error: null }); })
      .catch((error) => { if (!cancelled) setState({ loading: false, items: [], meta: null, error }); });
    return () => { cancelled = true; };
  }, [filters, page, reloadKey]);

  const setFilter = (field) => (e) => {
    setFilters((f) => ({ ...f, [field]: e.target.value }));
    setPage(1);
  };

  async function handleAction(action, appointment) {
    if (action === 'move') {
      setMoving(appointment);
      return;
    }
    if (CONFIRM[action] && !window.confirm(CONFIRM[action])) return;
    setBusyId(appointment.id);
    try {
      if (action === 'delete') await api.deleteAppointment(appointment.id);
      else await api.updateAppointment(appointment.id, { status: action });
      toast(DONE[action]);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  const isFiltered = Boolean(filters.search || filters.doctorId || filters.date || filters.status !== 'all');
  const { items, meta } = state;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 'var(--step-4)' }}>Qabullar</h1>
          <p>Registratura uchun: qabullarni toping, vaqtini ko&apos;chiring, bo&apos;lib o&apos;tganini yoki bemor kelmaganini belgilang.</p>
        </div>
        <Link className="btn btn-ticket" href="/shifokorlar">Yangi qabul</Link>
      </div>

      <section className="panel">
        <form className="filters" onSubmit={(e) => e.preventDefault()}>
          <div className="field grow">
            <label htmlFor="f-search">Bemor ismi yoki telefoni</label>
            <input id="f-search" className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Masalan: Aliyev yoki 901234567" autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="f-doctor">Shifokor</label>
            <select id="f-doctor" className="input" value={filters.doctorId} onChange={setFilter('doctorId')}>
              <option value="">Barchasi</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.fullName} ({d.specialty})</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-date">Sana</label>
            <input id="f-date" className="input" type="date" value={filters.date} onChange={setFilter('date')} />
          </div>
          <div className="field">
            <label htmlFor="f-status">Holat</label>
            <select id="f-status" className="input" value={filters.status} onChange={setFilter('status')}>
              <option value="all">Barchasi</option>
              <option value="scheduled">Kutilmoqda</option>
              <option value="completed">Bo&apos;ldi</option>
              <option value="no_show">Kelmadi</option>
              <option value="cancelled">Bekor qilingan</option>
            </select>
          </div>
          <button className="btn btn-ghost" type="button" disabled={!isFiltered}
            onClick={() => { setSearch(''); setFilters(EMPTY_FILTERS); setPage(1); }}>
            Tozalash
          </button>
        </form>

        <div aria-live="polite">
          {state.loading && <Loading text="Qabullar yuklanmoqda" />}
          {!state.loading && state.error && <ErrorState error={state.error} onRetry={reload} />}
          {!state.loading && !state.error && items.length === 0 && (
            <EmptyState
              title={isFiltered ? 'Mos qabul topilmadi' : "Hali qabullar yo'q"}
              text={isFiltered ? "Filtrlarni o'zgartirib ko'ring." : "Bemor shifokorni tanlab yozilgach, qabullar shu yerda ko'rinadi."}
            >
              {!isFiltered && <Link className="btn btn-primary btn-sm" href="/shifokorlar">Qabulga yozish</Link>}
            </EmptyState>
          )}
          {!state.loading && !state.error && items.length > 0 && (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Chipta</th><th>Vaqt</th><th>Bemor</th><th>Shifokor</th><th>Holat</th>
                    <th><span className="sr-only">Amallar</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => (
                    <tr key={a.id}>
                      <td data-label="Chipta"><span className="ticket-mini">№ {pad(a.ticketNumber)}</span></td>
                      <td data-label="Vaqt" className="when"><b>{relativeDay(a.appointmentDate)}</b><span className="muted">{a.startTime}</span></td>
                      <td data-label="Bemor">
                        <b>{a.patientName}</b>
                        <div className="muted">{formatPhone(a.patientPhone)}</div>
                        {a.complaint && <div className="small muted">{a.complaint}</div>}
                      </td>
                      <td data-label="Shifokor">
                        {a.doctor.fullName}
                        <div className="muted">{a.doctor.specialty}, {a.doctor.room}-xona</div>
                      </td>
                      <td data-label="Holat"><StatusPill status={a.status} /></td>
                      <td>
                        <div className="actions">
                          <RowActions appointment={a} busy={busyId === a.id} onAction={handleAction} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pager">
                <span className="small muted">Jami {meta.total} ta qabul, {meta.page}/{meta.pages}-sahifa</span>
                <div style={{ display: 'flex', gap: '.4rem' }}>
                  <button className="btn btn-ghost btn-sm" disabled={meta.page <= 1} onClick={() => setPage((p) => p - 1)}>Oldingi</button>
                  <button className="btn btn-ghost btn-sm" disabled={meta.page >= meta.pages} onClick={() => setPage((p) => p + 1)}>Keyingi</button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <MoveDialog
        appointment={moving}
        onClose={() => setMoving(null)}
        onMoved={() => {
          setMoving(null);
          toast("Qabul yangi vaqtga ko'chirildi");
          reload();
        }}
      />
    </>
  );
}
