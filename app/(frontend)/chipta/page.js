'use client';

// Mening chiptam: bemor telefon raqami orqali o'z qabullarini topadi va kerak bo'lsa bekor qiladi.
import Link from 'next/link';
import { useState } from 'react';
import Ticket from '@/components/Ticket';
import { useToast } from '@/components/Toast';
import { EmptyState, ErrorState, FieldError, Loading, StatusPill } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatPhone, isPast, maskPhone, pad, relativeDay } from '@/lib/format';

const normalize = (masked) => {
  const digits = masked.replace(/\D/g, '').replace(/^998/, '');
  return digits.length === 9 ? `+998${digits}` : null;
};

export default function MyTicketPage() {
  const toast = useToast();
  const [phone, setPhone] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [state, setState] = useState({ status: 'idle', list: [], error: null });
  const [busyId, setBusyId] = useState(null);

  async function find(e) {
    e?.preventDefault();
    const full = normalize(phone);
    if (!full) {
      setFieldError('Telefon raqamini to\'liq kiriting: +998 XX XXX XX XX');
      return;
    }
    setFieldError('');
    setState({ status: 'loading', list: [], error: null });
    try {
      const { data } = await api.appointments({ search: full.slice(4), limit: 100 });
      const mine = data
        .filter((a) => a.patientPhone === full)
        .sort((a, b) => `${a.appointmentDate}${a.startTime}`.localeCompare(`${b.appointmentDate}${b.startTime}`));
      setState({ status: 'done', list: mine, error: null });
    } catch (error) {
      setState({ status: 'error', list: [], error });
    }
  }

  async function cancel(a) {
    if (!window.confirm(`${relativeDay(a.appointmentDate)} soat ${a.startTime} dagi qabul bekor qilinsinmi?`)) return;
    setBusyId(a.id);
    try {
      await api.updateAppointment(a.id, { status: 'cancelled' });
      toast('Qabul bekor qilindi. Vaqt boshqa bemorlarga ochildi');
      await find();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  const upcoming = state.list.filter((a) => a.status === 'scheduled' && !isPast(a.appointmentDate, a.startTime));
  const history = state.list.filter((a) => !upcoming.includes(a)).reverse();

  return (
    <div className="narrow">
      <div className="page-head">
        <div>
          <h1>Mening chiptam</h1>
          <p>Yozilishda ko&apos;rsatgan telefon raqamingizni kiriting. Chiptangiz, xona raqami va vaqtingiz shu yerda turadi</p>
        </div>
      </div>

      <form className="panel lookup" onSubmit={find} noValidate>
        <div className="field">
          <label htmlFor="lookup-phone">Telefon raqami</label>
          <input id="lookup-phone" className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="+998 90 123 45 67"
            value={phone} aria-invalid={fieldError ? 'true' : undefined} onChange={(e) => setPhone(maskPhone(e.target.value))} />
          <FieldError message={fieldError} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={state.status === 'loading'}>Chiptani topish</button>
      </form>

      <div aria-live="polite">
        {state.status === 'loading' && <Loading text="Qidirilmoqda" />}
        {state.status === 'error' && <ErrorState error={state.error} onRetry={find} />}
        {state.status === 'done' && state.list.length === 0 && (
          <EmptyState title="Bu raqamga qabul topilmadi" text={`${formatPhone(normalize(phone))} raqamiga yozilgan qabul yo'q. Raqamni tekshiring yoki yangi qabulga yoziling.`}>
            <Link className="btn btn-ticket btn-sm" href="/shifokorlar">Qabulga yozilish</Link>
          </EmptyState>
        )}

        {upcoming.length > 0 && (
          <section className="stack">
            <h2>Kutilayotgan qabullar</h2>
            {upcoming.map((a) => (
              <Ticket key={a.id} number={a.ticketNumber} room={a.doctor.room} className="reveal">
                <p className="muted small" style={{ margin: 0 }}>{relativeDay(a.appointmentDate)}, soat {a.startTime}</p>
                <p className="ticket-title" style={{ margin: 0 }}>{a.doctor.fullName}</p>
                <dl className="ticket-row" style={{ margin: 0 }}>
                  <div><dt>Mutaxassislik</dt><dd>{a.doctor.specialty}</dd></div>
                  <div><dt>Sana</dt><dd>{formatDate(a.appointmentDate)}</dd></div>
                  <div><dt>Bemor</dt><dd>{a.patientName}</dd></div>
                </dl>
                <div className="row-actions">
                  <button className="btn btn-primary btn-sm" type="button" onClick={() => window.print()}>Chop etish</button>
                  <button className="btn btn-danger btn-sm" type="button" disabled={busyId === a.id} onClick={() => cancel(a)}>
                    {busyId === a.id ? 'Bekor qilinmoqda' : 'Bekor qilish'}
                  </button>
                </div>
              </Ticket>
            ))}
          </section>
        )}

        {history.length > 0 && (
          <section className="stack">
            <h2>Tarix</h2>
            <ul className="history">
              {history.map((a) => (
                <li key={a.id}>
                  <span className="ticket-mini">№ {pad(a.ticketNumber)}</span>
                  <div>
                    <b>{a.doctor.fullName}</b>
                    <span className="muted small">{a.doctor.specialty} · {formatDate(a.appointmentDate)}, {a.startTime}</span>
                  </div>
                  <StatusPill status={a.status} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
