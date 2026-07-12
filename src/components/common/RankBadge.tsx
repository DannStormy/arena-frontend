interface TierConfig {
  name: string;
  minScore: number;
  color: string;
  bg: string;
  border: string;
}

export const RANK_TIERS: TierConfig[] = [
  { name: 'Legend',     minScore: 3001, color: '#FF7043', bg: 'rgba(255,112,67,0.12)',   border: 'rgba(255,112,67,0.4)'   },
  { name: 'Champion',   minScore: 1501, color: '#F5A623', bg: 'rgba(245,166,35,0.12)',   border: 'rgba(245,166,35,0.4)'   },
  { name: 'Gladiator',  minScore:  501, color: '#D4664C', bg: 'rgba(212,102,76,0.12)',   border: 'rgba(212,102,76,0.4)'   },
  { name: 'Challenger', minScore:    1, color: '#4F9CF0', bg: 'rgba(79,156,240,0.12)',   border: 'rgba(79,156,240,0.3)'   },
  { name: 'Spectator',  minScore:    0, color: '#76767F', bg: 'rgba(118,118,127,0.10)', border: 'rgba(118,118,127,0.25)' },
];

export function getTierFromScore(score: number): TierConfig {
  return RANK_TIERS.find((t) => score >= t.minScore) ?? RANK_TIERS[RANK_TIERS.length - 1];
}

// Non-canonical strings (legacy BE values, tournament medal labels) fall through to Spectator.
export function getTierFromName(name: string): TierConfig {
  return RANK_TIERS.find((t) => t.name.toLowerCase() === name.toLowerCase())
    ?? RANK_TIERS[RANK_TIERS.length - 1];
}

// Returns true only for the 5 canonical season tier names.
// Use this to guard RankBadge calls so non-tier strings (e.g. BE "Bronze" placement labels)
// are handled at the call site rather than silently falling through to Spectator.
export function isKnownTier(name: string): boolean {
  return RANK_TIERS.some((t) => t.name.toLowerCase() === name.toLowerCase());
}

const SIZE_STYLES = {
  xs: { padding: '2px 6px',  fontSize: '9px',  letterSpacing: '0.06em' },
  sm: { padding: '3px 8px',  fontSize: '10px', letterSpacing: '0.07em' },
  md: { padding: '4px 10px', fontSize: '12px', letterSpacing: '0.07em' },
} as const;

export function RankBadge({
  rank,
  score,
  size = 'sm',
}: {
  rank?: string;
  score?: number;
  size?: 'xs' | 'sm' | 'md';
}) {
  const tier = rank ? getTierFromName(rank) : getTierFromScore(score ?? 0);
  // Always display the canonical tier name, never raw BE strings like "Bronze"
  const displayName = tier.name;
  const s = SIZE_STYLES[size];

  return (
    <span
      style={{
        display:       'inline-block',
        background:    tier.bg,
        border:        `1px solid ${tier.border}`,
        color:         tier.color,
        borderRadius:  '4px',
        padding:       s.padding,
        fontSize:      s.fontSize,
        fontWeight:    700,
        letterSpacing: s.letterSpacing,
        lineHeight:    1,
        fontFamily:    '"Chakra Petch", system-ui, sans-serif',
        whiteSpace:    'nowrap',
      }}
    >
      {displayName}
    </span>
  );
}
