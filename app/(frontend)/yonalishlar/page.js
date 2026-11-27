'use client';

// Yo'nalishlar: har bir mutaxassislik bo'yicha shifokorlar soni va eng yaqin bo'sh navbat.
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState, ErrorState, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { pad, relativeDay } from '@/lib/format';

const ABOUT = {
  Terapevt: "Umumiy ko'rik, shamollash, bosim. Boshqa mutaxassisga yo'llanma shu yerdan boshlanadi",
  Kardiolog: 'Yurak, qon bosimi, EKG xulosasi',
  Nevrolog: "Bosh og'rig'i, uyqusizlik, bel va bo'yin og'rig'i",
  Pediatr: "Bolalar ko'rigi, emlash jadvali, o'sish nazorati",
  Stomatolog: "Tish og'rig'i, plomba, profilaktik ko'rik",
  Endokrinolog: 'Qandli diabet, qalqonsimon bez',
  Oftalmolog: "Ko'rish o'tkirligi, ko'zoynak tanlash, ko'z bosimi",
};

export default function SpecialtiesPage() {
  const [state, setState] = useState({ loading: true, rows: [], error: null });

  const load = useCallback(async () => {
    setState({ loading: true, rows: [], error: null });
    try {
      const { data: specialties } = await api.specialties();
      const nearest = await Promise.allSettled(specialties.map((s) => api.nearest({ specialty: s.name })));
      const rows = specialties.map((s, i) => ({
        ...s,
        slot: nearest[i].status === 'fulfilled' ? nearest[i].value.data : null,
      }));
      setState({ loading: false, rows, error: null });
    } catch (error) {
      setState({ loading: false, rows: [], error });
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const { loading, rows, error } = state;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Yo&apos;nalishlar</h1>
          <p>Qaysi shifokor kerakligini bilsangiz, yo&apos;nalishni tanlang. Har biri uchun eng yaqin bo&apos;sh vaqt hisoblab qo&apos;yilgan</p>
        </div>
      </div>

      {loading && <Loading text="Yo'nalishlar yuklanmoqda" />}
      {error && <ErrorState error={error} onRetry={load} />}
      {!loading && !error && rows.length === 0 && (
        <EmptyState title="Hozircha yo'nalishlar yo'q" text="Boshqaruv sahifasida shifokor qo'shilgach, yo'nalishlar shu yerda chiqadi.">
          <Link className="btn btn-primary btn-sm" href="/admin/shifokorlar">Shifokor qo&apos;shish</Link>
        </EmptyState>
      )}
      {!loading && !error && rows.length > 0 && (
        <ul className="spec-list">
          {rows.map((r) => (
            <li key={r.name} className="spec-row reveal">
              <div>
                <h2 className="spec-name">{r.name}</h2>
                <p className="muted small">{ABOUT[r.name] || 'Mutaxassis qabuli'}</p>
              </div>
              <span className="spec-count">{r.doctors} shifokor</span>
              {r.slot ? (
                <div className="spec-slot">
                  <span className="ticket-mini">№ {pad(r.slot.ticketNumber)}</span>
                  <div>
                    <b>{relativeDay(r.slot.date)}, {r.slot.time}</b>
                    <span className="muted small">{r.slot.doctor.fullName}</span>
                  </div>
                </div>
              ) : (
                <span className="muted small">14 kun ichida bo&apos;sh vaqt yo&apos;q</span>
              )}
              {r.slot ? (
                <Link className="btn btn-ticket btn-sm" href={`/doctors/${r.slot.doctor.id}?date=${r.slot.date}&time=${r.slot.time}`}>Yozilish</Link>
              ) : (
                <span />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
