// Navbat chiptasi — ilovaning asosiy vizual elementi.
import { pad } from '@/lib/format';

export default function Ticket({ number, room, children, loading = false, className = '' }) {
  return (
    <article className={`ticket ${loading ? 'is-loading' : ''} ${className}`} aria-busy={loading || undefined}>
      <div className="ticket-main">{children}</div>
      <div className="ticket-stub">
        {loading ? (
          <div className="spinner" />
        ) : (
          <>
            <span className="ticket-no">
              <small>№</small>
              {pad(number)}
            </span>
            {room && <span className="room">{room}-xona</span>}
          </>
        )}
      </div>
    </article>
  );
}
