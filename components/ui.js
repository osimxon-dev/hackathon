'use client';

// Kichik, qayta ishlatiladigan UI bloklari: holatlar, holat belgisi, hafta chizig'i.
import { STATUS_LABELS, WEEKDAYS_SHORT } from '@/lib/format';

export function Loading({ text = 'Yuklanmoqda' }) {
  return (
    <div className="state" role="status">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "Ma'lumotni yuklab bo'lmadi" }) {
  return (
    <div className="state state-error" role="alert">
      <h3>{title}</h3>
      <p>{error?.message || String(error)}</p>
      {onRetry && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
          Qayta urinish
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, text, children }) {
  return (
    <div className="state">
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}

export function StatusPill({ status }) {
  return <span className={`pill pill-${status}`}>{STATUS_LABELS[status] || status}</span>;
}

export function WeekStrip({ workDays }) {
  return (
    <div className="week" aria-label="Ish kunlari">
      {WEEKDAYS_SHORT.map((day, i) => (
        <span key={day} className={workDays.includes(i + 1) ? 'on' : ''} title={day}>
          {day}
        </span>
      ))}
    </div>
  );
}

export function FieldError({ message }) {
  return <span className="error-text">{message || ''}</span>;
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
