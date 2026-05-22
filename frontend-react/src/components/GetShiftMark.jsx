export default function GetShiftMark({ size = 32, showAccent = true }) {
  const gid = `gs-mark-${size}`
  // Aux petites tailles : stroke plus épais et opacité plus forte pour lisibilité
  const isSmall = size < 28
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 64 64" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <defs>
        <linearGradient id={`${gid}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E07A3E" />
          <stop offset="100%" stopColor="#B8521C" />
        </linearGradient>
        <linearGradient id={`${gid}-hl`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
          <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#${gid}-bg)`} />
      <rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#${gid}-hl)`} />

      {/* Plaque arrière : outline blanc, position bottom-left */}
      <rect
        x="14" y="26" width="24" height="24" rx="5"
        fill="none" stroke="#FFFFFF"
        strokeWidth={isSmall ? 3.5 : 3}
        strokeOpacity={isSmall ? 0.7 : 0.6}
      />

      {/* Plaque avant : blanc plein, position top-right */}
      <rect x="26" y="14" width="24" height="24" rx="5" fill="#FFFFFF" />
    </svg>
  )
}
