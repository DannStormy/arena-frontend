// AvatarRing — SVG level-progress ring wrapping the "you" avatar.
// Purple track + arc; level badge pinned at bottom of the ring.
// Size 'md' = 88px outer (profile, home hero). Size 'sm' = 44px outer (header).
// animated=true: arc fills from empty on mount once (~600ms). Respects prefers-reduced-motion.

import { useState, useEffect } from 'react';

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
  animated?: boolean;
}

export function AvatarRing({ avatarUrl, initials, intoLevel, nextLevelAt, level, size = 'md', animated = false }: Props) {
  const c = CONFIG[size];
  const cx = c.outer / 2;
  const cy = c.outer / 2;
  const radius = cx - c.sw / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  const progress = nextLevelAt > 0 ? Math.min(intoLevel / nextLevelAt, 1) : 0;
  const inset = (c.outer - c.inner) / 2;
  const totalHeight = c.outer + Math.floor(c.badge / 2) + 2;

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Animate arc from empty → final on mount. Skip if not animated or reduced-motion.
  const [swept, setSwept] = useState(false);
  useEffect(() => {
    if (!animated || reduced) return;
    const id = setTimeout(() => setSwept(true), 80);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const finalOffset = circumference * (1 - progress);
  const arcOffset   = animated && !reduced && !swept ? circumference : finalOffset;

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
          stroke="rgba(198,220,232,0.15)"
          strokeWidth={c.sw}
        />
        {/* Progress arc — starts at 12 o'clock */}
        {(progress > 0 || (animated && !reduced)) && (
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="#C6DCE8"
            strokeWidth={c.sw}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={arcOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={animated && !reduced ? { transition: 'stroke-dashoffset 0.6s ease-out' } : undefined}
          />
        )}
      </svg>

      {/* Avatar disc */}
      <div
        className="absolute rounded-full overflow-hidden flex items-center justify-center"
        style={{
          top: inset, left: inset, width: c.inner, height: c.inner,
          background: 'rgba(198,220,232,0.15)',
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span
            className="font-bold select-none"
            style={{ fontSize: c.initFontSize, color: '#DCEAF2' }}
          >
            {initials}
          </span>
        )}
      </div>

      {/* Level badge — sits below the ring */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full font-display font-bold"
        style={{
          bottom:        0,
          width:         c.badge,
          height:        c.badge,
          fontSize:      c.badgeFontSize,
          background:    '#0A0A0F',
          border:        '1px solid rgba(198,220,232,0.55)',
          color:         '#C6DCE8',
          letterSpacing: '0.02em',
        }}
      >
        {level}
      </div>
    </div>
  );
}
