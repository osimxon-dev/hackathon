'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/Toast';
import { EmptyState, ErrorState, FieldError, Loading, SearchIcon, WeekStrip } from '@/components/ui';
import { api } from '@/lib/api';
import { WEEKDAYS_SHORT } from '@/lib/format';

const EMPTY_DOCTOR = {
  fullName: '',
  specialty: '',
  room: '',
  workStart: '09:00',
  workEnd: '17:00',
  slotMinutes: 20,
  experienceYears: 0,
  workDays: [1, 2, 3, 4, 5],
  bio: '',
  isActive: true,
};

function DoctorDialog({ doctor, specialties, onClose, onSaved }) {
  const ref = useRef(null);
  const [form, setForm] = useState(EMPTY_DOCTOR);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const isEdit = Boolean(doctor?.id);

  useEffect(() => {
    if (doctor) {
      setForm(isEdit ? { ...EMPTY_DOCTOR, ...doctor, bio: doctor.bio || '' } : EMPTY_DOCTOR);
      setErrors({});
      setFormError('');
      ref.current?.showModal();
    } else {
      ref.current?.close();
    }
  }, [doctor, isEdit]);

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const toggleDay = (day) => set('workDays', form.workDays.includes(day)
    ? form.workDays.filter((d) => d !== day)
    : [...form.workDays, day].sort());

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    const payload = {
      fullName: form.fullName.trim(),
      specialty: form.specialty.trim(),
      room: form.room.trim(),
      workStart: form.workStart,
      workEnd: form.workEnd,
      slotMinutes: Number(form.slotMinutes),
      experienceYears: Number(form.experienceYears),
      workDays: form.workDays,
      bio: form.bio.trim() || null,
      isActive: form.isActive,
    };
    setBusy(true);
    try {
      if (isEdit) await api.updateDoctor(doctor.id, payload);
      else await api.createDoctor(payload);
      onSaved(isEdit ? "O'zgarishlar saqlandi" : "Shifokor qo'shildi");
    } catch (err) {
      setErrors(err.details || {});
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="doctor-dialog-title">
      {doctor && (
        <form onSubmit={submit} noValidate>
          <div className="dialog-body">
            <h2 id="doctor-dialog-title">{isEdit ? 'Shifokorni tahrirlash' : 'Yangi shifokor'}</h2>
            <div className="form-grid">
              <div className="field full">
                <label htmlFor="d-fullName">F.I.Sh.</label>
                <input id="d-fullName" className="input" maxLength={120} value={form.fullName}
                  onChange={(e) => set('fullName', e.target.value)} aria-invalid={Boolean(errors.fullName) || undefined} />
                <FieldError message={errors.fullName} />
              </div>
              <div className="field">
                <label htmlFor="d-specialty">Mutaxassislik</label>
                <input id="d-specialty" className="input" list="specialty-list" maxLength={80} value={form.specialty}
                  onChange={(e) => set('specialty', e.target.value)} aria-invalid={Boolean(errors.specialty) || undefined} />
                <datalist id="specialty-list">{specialties.map((s) => <option key={s} value={s} />)}</datalist>
                <FieldError message={errors.specialty} />
              </div>
              <div className="field">
                <label htmlFor="d-room">Xona</label>
                <input id="d-room" className="input" maxLength={10} value={form.room}
                  onChange={(e) => set('room', e.target.value)} aria-invalid={Boolean(errors.room) || undefined} />
                <FieldError message={errors.room} />
              </div>
              <div className="field">
                <label htmlFor="d-workStart">Ish boshlanishi</label>
                <input id="d-workStart" className="input" type="time" value={form.workStart} onChange={(e) => set('workStart', e.target.value)} />
                <FieldError message={errors.workStart} />
              </div>
              <div className="field">
                <label htmlFor="d-workEnd">Ish tugashi</label>
                <input id="d-workEnd" className="input" type="time" value={form.workEnd} onChange={(e) => set('workEnd', e.target.value)}
                  aria-invalid={Boolean(errors.workEnd) || undefined} />
                <FieldError message={errors.workEnd} />
              </div>
              <div className="field">
                <label htmlFor="d-slot">Bitta qabul davomiyligi</label>
                <select id="d-slot" className="input" value={form.slotMinutes} onChange={(e) => set('slotMinutes', e.target.value)}>
                  {[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} daqiqa</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="d-exp">Tajriba (yil)</label>
                <input id="d-exp" className="input" type="number" min={0} max={60} value={form.experienceYears}
                  onChange={(e) => set('experienceYears', e.target.value)} />
                <FieldError message={errors.experienceYears} />
              </div>
              <fieldset className="field full" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend style={{ fontSize: 'var(--step--1)', fontWeight: 600, marginBottom: '.35rem' }}>Ish kunlari</legend>
                <div className="chips">
                  {WEEKDAYS_SHORT.map((label, i) => (
                    <button key={label} type="button" className="chip" aria-pressed={form.workDays.includes(i + 1)} onClick={() => toggleDay(i + 1)}>
                      {label}
                    </button>
                  ))}
                </div>
                <FieldError message={errors.workDays} />
              </fieldset>
              <div className="field full">
                <label htmlFor="d-bio">Qisqacha ma&apos;lumot <span className="muted">(ixtiyoriy)</span></label>
                <textarea id="d-bio" className="input" maxLength={400} value={form.bio} onChange={(e) => set('bio', e.target.value)} />
              </div>
              <label className="full" style={{ display: 'flex', gap: '.5rem', alignItems: 'center', fontWeight: 600, fontSize: 'var(--step--1)' }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
                Qabul qiladi (faol)
              </label>
            </div>
            {formError && <p className="notice" role="alert">{formError}</p>}
          </div>
          <div className="dialog-actions">
            <button className="btn btn-ghost" type="button" onClick={onClose}>Yopish</button>
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saqlanmoqda' : 'Saqlash'}</button>
          </div>
        </form>
      )}
    </dialog>
  );
}

export default function AdminPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState('all');
  const [state, setState] = useState({ loading: true, doctors: [], error: null });
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    api.doctors({ search: query, active })
      .then(({ data }) => { if (!cancelled) setState({ loading: false, doctors: data, error: null }); })
      .catch((error) => { if (!cancelled) setState({ loading: false, doctors: [], error }); });
    return () => { cancelled = true; };
  }, [query, active, reloadKey]);

  async function toggleActive(d) {
    setBusyId(d.id);
    try {
      await api.updateDoctor(d.id, { isActive: !d.isActive });
      toast(d.isActive ? 'Shifokor faolsizlantirildi' : 'Shifokor yana qabul qiladi');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(d) {
    if (!window.confirm(`${d.fullName} o'chirilsinmi? Bu amalni qaytarib bo'lmaydi.`)) return;
    setBusyId(d.id);
    try {
      await api.deleteDoctor(d.id);
      toast("Shifokor o'chirildi");
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  const specialties = [...new Set(state.doctors.map((d) => d.specialty))];

  return (
    <>
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 'var(--step-4)' }}>Shifokorlar jadvali</h1>
          <p>Shifokor qo&apos;shing, ish kunlari va soatlarini belgilang. Jadval o&apos;zgarsa, mavjud qabullar unga sig&apos;ishi tekshiriladi.</p>
        </div>
        <button className="btn btn-ticket" type="button" onClick={() => setEditing({})}>Shifokor qo&apos;shish</button>
      </div>

      <section className="panel">
        <div className="toolbar">
          <label className="search">
            <span className="sr-only">Qidirish</span>
            <SearchIcon />
            <input className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Ism yoki mutaxassislik" autoComplete="off" />
          </label>
          <select className="input" style={{ width: 'auto' }} value={active} onChange={(e) => setActive(e.target.value)} aria-label="Faollik bo'yicha filtr">
            <option value="all">Barchasi</option>
            <option value="true">Faol</option>
            <option value="false">Faol emas</option>
          </select>
        </div>

        {state.loading && <Loading text="Shifokorlar yuklanmoqda" />}
        {!state.loading && state.error && <ErrorState error={state.error} onRetry={reload} />}
        {!state.loading && !state.error && state.doctors.length === 0 && (
          <EmptyState title="Shifokor topilmadi" text="Qidiruvni o'zgartiring yoki yangi shifokor qo'shing.">
            <button className="btn btn-primary btn-sm" type="button" onClick={() => setEditing({})}>Shifokor qo&apos;shish</button>
          </EmptyState>
        )}
        {!state.loading && !state.error && state.doctors.length > 0 && (
          <table className="table">
            <thead>
              <tr><th>Shifokor</th><th>Jadval</th><th>Kutilayotgan qabullar</th><th>Holat</th><th><span className="sr-only">Amallar</span></th></tr>
            </thead>
            <tbody>
              {state.doctors.map((d) => (
                <tr key={d.id}>
                  <td data-label="Shifokor">
                    <Link href={`/doctors/${d.id}`}><b>{d.fullName}</b></Link>
                    <div className="muted">{d.specialty}, {d.room}-xona</div>
                  </td>
                  <td data-label="Jadval">
                    <span className="muted">{d.workStart}–{d.workEnd}, {d.slotMinutes} daq.</span>
                    <WeekStrip workDays={d.workDays} />
                  </td>
                  <td data-label="Kutilayotgan qabullar">{d.upcomingCount}</td>
                  <td data-label="Holat">
                    <span className={`pill ${d.isActive ? 'pill-completed' : 'pill-inactive'}`}>{d.isActive ? 'Faol' : 'Faol emas'}</span>
                  </td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-ghost btn-sm" disabled={busyId === d.id} onClick={() => setEditing(d)}>Tahrirlash</button>
                      <button className="btn btn-ghost btn-sm" disabled={busyId === d.id} onClick={() => toggleActive(d)}>
                        {d.isActive ? 'Faolsizlantirish' : 'Faollashtirish'}
                      </button>
                      <button className="btn btn-danger btn-sm" disabled={busyId === d.id} onClick={() => remove(d)}>O&apos;chirish</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <DoctorDialog
        doctor={editing}
        specialties={specialties}
        onClose={() => setEditing(null)}
        onSaved={(message) => {
          setEditing(null);
          toast(message);
          reload();
        }}
      />
    </>
  );
}
