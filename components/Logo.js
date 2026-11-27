// Navbat logotipi: to'q sariq yumaloq kvadrat, qalin "N" va tibbiy "+" belgisi.
// Header, admin panel, kirish sahifasi va footerda ishlatiladi (app/icon.svg ham shu belgi).
export default function Logo({ size = 36 }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Navbat logotipi">
      <rect width="48" height="48" rx="13" fill="#ff4a14" />
      <path d="M12 37V17L32 37V17" fill="none" stroke="#111214" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 5.5V14.5M33.5 10H42.5" fill="none" stroke="#111214" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
