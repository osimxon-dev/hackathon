// Navbat logotipi: yon tomonlarida o'yig'i bor navbat chiptasi va ichida "N".
// Header, admin panel, kirish sahifasi va footerda ishlatiladi (app/icon.svg ham shu shakl).
export default function Logo({ size = 36 }) {
  return (
    <svg className="logo-mark" width={size} height={Math.round((size * 40) / 48)} viewBox="0 0 48 40" role="img" aria-label="Navbat logotipi">
      <path
        fill="#ff4a14"
        d="M6 4H42A4 4 0 0 1 46 8V14A6 6 0 0 0 46 26V32A4 4 0 0 1 42 36H6A4 4 0 0 1 2 32V26A6 6 0 0 0 2 14V8A4 4 0 0 1 6 4Z"
      />
      <path fill="#111214" d="M16 28V12H19.2L28.8 23V12H32V28H28.8L19.2 17V28Z" />
      <path stroke="#111214" strokeOpacity=".35" strokeWidth="1.5" strokeDasharray="2 3" d="M38 8V32" />
    </svg>
  );
}
