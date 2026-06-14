// AvatarRing — SVG level-progress ring wrapping the "you" avatar.
// Purple track + arc; level badge pinned at bottom of the ring.
// Size 'md' = 88px outer (profile). Size 'sm' = 44px outer (future header use).

const CONFIG = {
  md: { outer: 88, inner: 72, sw: 3,   initFontSize: '20px', badge: 20, badgeFontSize: '10px' },
  sm: { outer: 44, inner: 34, sw: 2.5, initFontSize: '11px', badge: 16, badgeFontSize: '8px'  },
} as const;

interface Props {
  avatarUrl?: string | null;
  initials: string;
  intoLevel: number;
  nextLevelAt: number;
  level: number;
  size?: 'md' | 'sm';
}

export function AvatarRing({ avatarUrl, initials, intoLevel, nextLevelAt, level, size = 'md' }: Props) {
  const c = CONFIG[size];
  const cx = c.outer / 2;
  const cy = c.outer / 2;
  const radius = cx - c.sw / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  const progress = nextLevelAt > 0 ? Math.min(intoLevel / nextLevelAt, 1) : 0;
  const inset = (c.outer - c.inner) / 2;
  const totalHeight = c.outer + Math.floor(c.badge / 2) + 2;

  return (
    <div
      className="relative shrink-0"
      style={{ width: c.outer, height: totalHeight }}
    >
      {/* Ring SVG */}
      <svg
        width={c.outer}
        height={c.outer}
        style={{ position: 'absolute', top: 0, left: 0 }}
        aria-hidden="true"
      >
        {/* Neutral track */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="rgba(124,92,255,0.18)"
          strokeWidth={c.sw}
        />
        {/* Progress arc — starts at 12 o'clock */}
        {progress > 0 && (
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="#7C5CFF"
            strokeWidth={c.sw}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        )}
      </svg>

      {/* Avatar disc */}
      <div
        className="absolute rounded-full overflow-hidden flex items-center justify-center"
        style={{
          top: inset, left: inset, width: c.inner, height: c.inner,
          background: '#7C5CFF',
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span
            className="font-bold text-white select-none"
            style={{ fontSize: c.initFontSize }}
          >
            {initials}
          </span>
        )}
      </div>

      {/* Level badge — sits below the ring */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full font-display font-bold"
        style={{
          bottom:      0,
          width:       c.badge,
          height:      c.badge,
          fontSize:    c.badgeFontSize,
          background:  '#0A0A0F',
          border:      '1px solid rgba(124,92,255,0.6)',
          color:       '#8E72FF',
          letterSpacing: '0.02em',
        }}
      >
        {level}
      </div>
    </div>
  );
}
