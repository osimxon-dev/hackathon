'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import Ticket from '@/components/Ticket';
import { useToast } from '@/components/Toast';
import { EmptyState, ErrorState, FieldError, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import {
  addDays, formatDate, formatPhone, initials, maskPhone, pad, relativeDay, todayISO, weekdayIndex, WEEKDAYS_SHORT,
} from '@/lib/format';

const DAYS_AHEAD = 14;

function firstWorkingDay(doctor, from) {
  for (let i = 0; i <= DAYS_AHEAD; i++) {
    const date = addDays(from, i);
    if (doctor.workDays.includes(weekdayIndex(date))) return date;
  }
  return from;
}

function Profile({ doctor: d }) {
  return (
    <aside className="profile">
      <div className="avatar" aria-hidden="true">{initials(d.fullName)}</div>
      <h1 style={{ fontSize: 'var(--step-2)' }}>{d.fullName}</h1>
      <p className="muted" style={{ margin: '.3rem 0 0' }}>{d.specialty}</p>
      {d.bio && <p style={{ margin: '1rem 0 0' }}>{d.bio}</p>}
      <dl>
        <div><dt>Xona</dt><dd>{d.room}</dd></div>
        <div><dt>Tajriba</dt><dd>{d.experienceYears} yil</dd></div>
        <div><dt>Ish vaqti</dt><dd>{d.workStart}–{d.workEnd}</dd></div>
        <div><dt>Ish kunlari</dt><dd>{d.workDays.map((n) => WEEKDAYS_SHORT[n - 1]).join(', ')}</dd></div>
        <div><dt>Bitta qabul</dt><dd>{d.slotMinutes} daqiqa</dd></div>
      </dl>
    </aside>
  );
}

function DayPicker({ doctor, value, onChange }) {
  const today = todayISO();
  return (
    <div className="days" role="group" aria-label="Sana">
      {Array.from({ length: DAYS_AHEAD }, (_, i) => {
        const date = addDays(today, i);
        const wd = weekdayIndex(date);
        const works = doctor.workDays.includes(wd);
        const label = i === 0 ? 'Bugun' : i === 1 ? 'Ertaga' : WEEKDAYS_SHORT[wd - 1];
        return (
          <button
            key={date}
            type="button"
            className={`day ${works ? '' : 'off'}`}
            aria-pressed={date === value}
            title={works ? formatDate(date) : 'Dam olish kuni'}
            onClick={() => onChange(date)}
          >
            <span>{label}</span>
            <b>{Number(date.slice(8, 10))}</b>
            <span>{works ? 'ish kuni' : 'dam'}</span>
          </button>
        );
      })}
    </div>
  );
}

function SlotGrid({ slots, selected, onSelect }) {
  return (
    <>
      <div className="slots" role="group" aria-label="Qabul vaqtlari">
        {slots.slots.map((s) => {
          const disabled = s.status !== 'free';
          const label = s.status === 'booked' ? 'band' : s.status === 'past' ? "o'tgan" : `№ ${pad(s.ticketNumber)}`;
          return (
            <button
              key={s.time}
              type="button"
              className="slot"
              disabled={disabled}
              aria-pressed={!disabled && s.time === selected}
              onClick={() => onSelect(s.time)}
            >
              <b>{s.time}</b>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      <p className="legend">
        <span><i />bo&apos;sh</span>
        <span><i className="busy" />band yoki o&apos;tgan</span>
        <span><i className="sel" />tanlangan</span>
        <span>{slots.freeCount} ta bo&apos;sh vaqt</span>
      </p>
    </>
  );
}

function BookingForm({ doctor, date, slot, onBooked, onConflict }) {
  const [form, setForm] = useState({ patientName: '', patientPhone: '', complaint: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus({ preventScroll: true });
    nameRef.current?.closest('form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [slot.time]);

  const update = (field) => (e) => {
    const value = field === 'patientPhone' ? maskPhone(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    // Tezkor tekshiruv brauzerda; asosiy tekshiruv baribir serverda
    const local = {};
    if (form.patientName.trim().length < 3) local.patientName = "Ism kamida 3 harfdan iborat bo'lsin";
    if (!/^(998)?\d{9}$/.test(form.patientPhone.replace(/\D/g, ''))) local.patientPhone = "Raqamni to'liq kiriting: +998 XX XXX XX XX";
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.book({
        doctorId: doctor.id,
        patientName: form.patientName.trim(),
        patientPhone: form.patientPhone,
        complaint: form.complaint.trim() || null,
        appointmentDate: date,
        startTime: slot.time,
      });
      onBooked(data);
    } catch (err) {
      setErrors(err.details || {});
      setFormError(err.message);
      if (err.status === 409) onConflict(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="booking reveal" onSubmit={submit} noValidate>
      <h2>{relativeDay(date)}, soat {slot.time} ga yozilish</h2>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="patientName">Bemorning ismi va familiyasi</label>
          <input ref={nameRef} id="patientName" className="input" autoComplete="name" maxLength={100}
            placeholder="Aliyev Sherzod" value={form.patientName} onChange={update('patientName')}
            aria-invalid={Boolean(errors.patientName) || undefined} />
          <FieldError message={errors.patientName} />
        </div>
        <div className="field">
          <label htmlFor="patientPhone">Telefon raqami</label>
          <input id="patientPhone" className="input" type="tel" inputMode="tel" autoComplete="tel"
            placeholder="+998 90 123 45 67" value={form.patientPhone} onChange={update('patientPhone')}
            aria-invalid={Boolean(errors.patientPhone) || undefined} />
          <FieldError message={errors.patientPhone} />
        </div>
        <div className="field full">
          <label htmlFor="complaint">Nima bezovta qilyapti? <span className="muted">(ixtiyoriy)</span></label>
          <textarea id="complaint" className="input" maxLength={500} placeholder="Masalan: 3 kundan beri bosh og'rig'i"
            value={form.complaint} onChange={update('complaint')} />
          <FieldError message={errors.complaint} />
        </div>
      </div>
      {formError && <p className="notice" role="alert" style={{ marginTop: '1rem' }}>{formError}</p>}
      <div style={{ marginTop: '1.25rem', display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-ticket" type="submit" disabled={busy}>
          {busy ? 'Band qilinmoqda' : 'Navbatni band qilish'}
        </button>
        <span className="small muted">Chipta raqamingiz: № {pad(slot.ticketNumber)}</span>
      </div>
    </form>
  );
}

function Confirmation({ appointment: a }) {
  return (
    <div style={{ maxWidth: 640, marginInline: 'auto' }}>
      <h1 style={{ fontSize: 'var(--step-3)', marginBottom: '.5rem' }}>Navbat band qilindi</h1>
      <p className="muted" style={{ margin: '0 0 1.5rem' }}>
        Chiptani saqlab qo&apos;ying yoki skrinshot oling. Qabulga 10 daqiqa oldin keling.
      </p>
      <Ticket number={a.ticketNumber} room={a.doctor.room} className="reveal">
        <p className="ticket-title" style={{ margin: 0 }}>{a.doctor.fullName}</p>
        <dl className="ticket-row" style={{ margin: 0 }}>
          <div><dt>Mutaxassislik</dt><dd>{a.doctor.specialty}</dd></div>
          <div><dt>Sana</dt><dd>{formatDate(a.appointmentDate)}</dd></div>
          <div><dt>Vaqt</dt><dd>{a.startTime}</dd></div>
        </dl>
        <dl className="ticket-row" style={{ margin: 0 }}>
          <div><dt>Bemor</dt><dd>{a.patientName}</dd></div>
          <div><dt>Telefon</dt><dd>{formatPhone(a.patientPhone)}</dd></div>
        </dl>
      </Ticket>
      <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
        <button className="btn btn-primary" type="button" onClick={() => window.print()}>Chiptani chop etish</button>
        <Link className="btn btn-ghost" href="/chipta">Mening qabullarim</Link>
        <Link className="btn btn-ghost" href="/">Bosh sahifa</Link>
      </div>
    </div>
  );
}

export default function DoctorPage() {
  const { id } = useParams();
  const doctorId = Number(id);
  const toast = useToast();

  const [doctor, setDoctor] = useState({ loading: true, data: null, error: null });
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [slots, setSlots] = useState({ loading: false, data: null, error: null });
  const [booked, setBooked] = useState(null);

  const loadDoctor = useCallback(async () => {
    setDoctor({ loading: true, data: null, error: null });
    try {
      const { data } = await api.doctor(doctorId);
      // Bosh sahifadagi "eng yaqin navbat" havolasidan kelgan sana/vaqt
      const params = new URLSearchParams(window.location.search);
      const today = todayISO();
      const requested = params.get('date');
      setDate(requested && requested >= today ? requested : firstWorkingDay(data, today));
      setTime(params.get('time'));
      setDoctor({ loading: false, data, error: null });
    } catch (error) {
      setDoctor({ loading: false, data: null, error });
    }
  }, [doctorId]);

  const loadSlots = useCallback(async () => {
    if (!date) return;
    setSlots((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data } = await api.doctorSlots(doctorId, date);
      setSlots({ loading: false, data, error: null });
    } catch (error) {
      setSlots({ loading: false, data: null, error });
    }
  }, [doctorId, date]);

  useEffect(() => {
    if (Number.isInteger(doctorId) && doctorId > 0) loadDoctor();
  }, [doctorId, loadDoctor]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  if (!Number.isInteger(doctorId) || doctorId <= 0) {
    return (
      <EmptyState title="Shifokor tanlanmagan" text="Bosh sahifadan shifokorni tanlang.">
        <Link className="btn btn-primary btn-sm" href="/">Shifokorlar ro&apos;yxati</Link>
      </EmptyState>
    );
  }
  if (booked) return <Confirmation appointment={booked} />;
  if (doctor.loading) return <Loading text="Shifokor ma'lumotlari yuklanmoqda" />;
  if (doctor.error) {
    return doctor.error.status === 404 ? (
      <EmptyState title="Shifokor topilmadi" text="U ro'yxatdan olib tashlangan bo'lishi mumkin.">
        <Link className="btn btn-primary btn-sm" href="/">Shifokorlar ro&apos;yxati</Link>
      </EmptyState>
    ) : <ErrorState error={doctor.error} onRetry={loadDoctor} />;
  }

  const d = doctor.data;
  const selectedSlot = slots.data?.slots.find((s) => s.time === time && s.status === 'free');

  return (
    <>
      <p className="small" style={{ margin: '0 0 1rem' }}><Link href="/">Barcha shifokorlar</Link></p>
      <div className="doctor-layout">
        <Profile doctor={d} />
        <section>
          {!d.isActive && (
            <p className="notice" style={{ marginTop: 0 }}>Bu shifokor hozircha qabul qilmaydi. Boshqa mutaxassisni tanlang.</p>
          )}
          <h2 style={{ marginBottom: '1rem' }}>Kunni tanlang</h2>
          <DayPicker doctor={d} value={date} onChange={(value) => { setDate(value); setTime(null); }} />

          <h2 style={{ marginBottom: '1rem' }}>{relativeDay(date)}: bo&apos;sh vaqtlar</h2>
          {slots.loading && <Loading text="Jadval yuklanmoqda" />}
          {!slots.loading && slots.error && <ErrorState error={slots.error} onRetry={loadSlots} />}
          {!slots.loading && slots.data && !slots.data.workingDay && (
            <EmptyState title="Bu kun shifokor qabul qilmaydi" text="Yuqoridagi ro'yxatdan ish kunini tanlang." />
          )}
          {!slots.loading && slots.data?.workingDay && slots.data.freeCount === 0 && (
            <EmptyState title="Bu kunga bo'sh vaqt qolmagan" text="Boshqa kunni tanlang: odatda keyingi kunlarda joy bo'ladi." />
          )}
          {!slots.loading && slots.data?.workingDay && slots.data.freeCount > 0 && (
            <SlotGrid slots={slots.data} selected={time} onSelect={setTime} />
          )}

          {d.isActive && selectedSlot && (
            <BookingForm
              key={`${date}-${selectedSlot.time}`}
              doctor={d}
              date={date}
              slot={selectedSlot}
              onConflict={(message) => {
                toast(message, 'error');
                loadSlots();
              }}
              onBooked={(appointment) => {
                setBooked(appointment);
                toast('Navbat band qilindi');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </section>
      </div>
    </>
  );
}
