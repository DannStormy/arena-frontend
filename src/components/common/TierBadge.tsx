// TierBadge — swappable visual emblem for each rank tier.
//
// HOW TO SWAP ART: each tier's SVG is isolated in its own exported Emblem
// function at the bottom of this file. Replace the SVG body inside e.g.
// `GladiatorEmblem` and TierBadge picks it up automatically — no screen
// code needs to change.
//
// Screen code imports: TierBadge, getTierDisplayName, getTierInkColor,
//   getTierFromScore, normalizeTierName, TIER_THRESHOLDS.

import type { ReactNode } from 'react';

// ── Tier names ───────────────────────────────────────────────────────────────

export type TierName = 'spectator' | 'challenger' | 'gladiator' | 'champion' | 'legend';
export type BadgeSize = 'sm' | 'md' | 'lg';

// ── Thresholds (matches progression backend config) ──────────────────────────
// Spectator 0 / Challenger 500 / Gladiator 1 500 / Champion 4 000 / Legend 10 000

export const TIER_THRESHOLDS: { name: TierName; minScore: number }[] = [
  { name: 'legend',     minScore: 10_000 },
  { name: 'champion',   minScore:  4_000 },
  { name: 'gladiator',  minScore:  1_500 },
  { name: 'challenger', minScore:    500 },
  { name: 'spectator',  minScore:      0 },
];

export function getTierFromScore(score: number): TierName {
  return (
    TIER_THRESHOLDS.find((t) => score >= t.minScore) ??
    TIER_THRESHOLDS[TIER_THRESHOLDS.length - 1]
  ).name;
}

export function normalizeTierName(raw: string): TierName {
  const lower = raw.toLowerCase();
  return TIER_THRESHOLDS.some((t) => t.name === lower)
    ? (lower as TierName)
    : 'spectator';
}

// ── Visual config per tier ───────────────────────────────────────────────────

interface TierVisual {
  displayName: string;
  bg: string;
  frame: string;
  ink: string;
  glow?: string;
}

const TIER_VISUAL: Record<TierName, TierVisual> = {
  spectator: {
    displayName: 'Spectator',
    bg:    '#111018',
    frame: 'rgba(118,118,127,0.28)',
    ink:   '#444450',
  },
  challenger: {
    displayName: 'Challenger',
    bg:    '#0E0D12',
    frame: 'rgba(232,137,59,0.55)',
    ink:   '#E8893B',
  },
  gladiator: {
    displayName: 'Gladiator',
    bg:    '#130F0B',
    frame: '#E8893B',
    ink:   '#F0B05A',
    glow:  'drop-shadow(0 0 7px rgba(232,137,59,0.45))',
  },
  champion: {
    displayName: 'Champion',
    bg:    '#161000',
    frame: '#F5A623',
    ink:   '#F5A623',
    glow:  'drop-shadow(0 0 10px rgba(245,166,35,0.55))',
  },
  legend: {
    displayName: 'Legend',
    bg:    '#1A0F00',
    frame: '#FFD060',
    ink:   '#FFD060',
    glow:  'drop-shadow(0 0 14px rgba(255,208,96,0.65))',
  },
};

// ── Size config ──────────────────────────────────────────────────────────────

const SIZE_CONFIG = {
  sm: { px: 28, chamfer: 4,  border: 1,   emblPct: 0.60 },
  md: { px: 40, chamfer: 6,  border: 1.5, emblPct: 0.60 },
  lg: { px: 72, chamfer: 10, border: 2,   emblPct: 0.58 },
} as const;

// ── Emblem components ────────────────────────────────────────────────────────
// Placeholder art using radial/radiating geometry. Replace SVG body to swap.

export function SpectatorEmblem({ size, color }: { size: number; color: string }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden>
      <circle cx="50" cy="50" r="28" stroke={color} strokeWidth="2" opacity="0.55"/>
      <circle cx="50" cy="50" r="5"  fill={color} opacity="0.40"/>
    </svg>
  );
}

export function ChallengerEmblem({ size, color }: { size: number; color: string }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden>
      <circle cx="50" cy="50" r="30" stroke={color} strokeWidth="2"/>
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <line
          key={deg}
          x1="50" y1="14" x2="50" y2="24"
          stroke={color} strokeWidth="2" strokeLinecap="round"
          transform={`rotate(${deg}, 50, 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="5" fill={color}/>
    </svg>
  );
}

export function GladiatorEmblem({ size, color }: { size: number; color: string }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden>
      <circle cx="50" cy="50" r="33" stroke={color} strokeWidth="2"/>
      <circle cx="50" cy="50" r="18" stroke={color} strokeWidth="1.5"/>
      {[0, 90, 180, 270].map((deg) => (
        <line
          key={deg}
          x1="50" y1="12" x2="50" y2="24"
          stroke={color} strokeWidth="2.5" strokeLinecap="round"
          transform={`rotate(${deg}, 50, 50)`}
        />
      ))}
      <polygon points="50,41 58,50 50,59 42,50" fill={color}/>
    </svg>
  );
}

export function ChampionEmblem({ size, color }: { size: number; color: string }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden>
      <circle cx="50" cy="50" r="35" stroke={color} strokeWidth="2"/>
      <circle cx="50" cy="50" r="20" stroke={color} strokeWidth="1.5"/>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="50" y1="10"
          x2="50" y2={deg % 90 === 0 ? '22' : '18'}
          stroke={color}
          strokeWidth={deg % 90 === 0 ? '2.5' : '1.5'}
          strokeLinecap="round"
          transform={`rotate(${deg}, 50, 50)`}
        />
      ))}
      <line x1="50" y1="41" x2="50" y2="59" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <line x1="41" y1="50" x2="59" y2="50" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="50" cy="50" r="3.5" fill={color}/>
    </svg>
  );
}

export function LegendEmblem({ size, color }: { size: number; color: string }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden>
      <circle cx="50" cy="50" r="37" stroke={color} strokeWidth="2.5"/>
      <circle cx="50" cy="50" r="21" stroke={color} strokeWidth="1.5"/>
      {Array.from({ length: 12 }, (_, i) => i * 30).map((deg) => (
        <line
          key={deg}
          x1="50" y1="8"
          x2="50" y2={deg % 90 === 0 ? '21' : '17'}
          stroke={color}
          strokeWidth={deg % 90 === 0 ? '2.5' : '1.5'}
          strokeLinecap="round"
          transform={`rotate(${deg}, 50, 50)`}
        />
      ))}
      {/* Woven center: two overlapping rotated diamonds */}
      <polygon points="50,38 58,50 50,62 42,50" stroke={color} strokeWidth="1.5"/>
      <polygon
        points="50,38 58,50 50,62 42,50"
        stroke={color} strokeWidth="1.5"
        transform="rotate(45, 50, 50)"
      />
      <circle cx="50" cy="50" r="4" fill={color}/>
    </svg>
  );
}

// Emblem lookup — swap any function body to change that tier's art
const TIER_EMBLEMS: Record<TierName, (props: { size: number; color: string }) => ReactNode> = {
  spectator:  (p) => <SpectatorEmblem  {...p} />,
  challenger: (p) => <ChallengerEmblem {...p} />,
  gladiator:  (p) => <GladiatorEmblem  {...p} />,
  champion:   (p) => <ChampionEmblem   {...p} />,
  legend:     (p) => <LegendEmblem     {...p} />,
};

// ── TierBadge ────────────────────────────────────────────────────────────────

interface TierBadgeProps {
  /** Tier name string (case-insensitive) or season points number */
  tier: string | number;
  size?: BadgeSize;
}

export function TierBadge({ tier, size = 'md' }: TierBadgeProps) {
  const name: TierName =
    typeof tier === 'number'
      ? getTierFromScore(tier)
      : normalizeTierName(String(tier));

  const visual = TIER_VISUAL[name];
  const sc     = SIZE_CONFIG[size];
  const px     = sc.px;
  const ch     = sc.chamfer;

  const clipPath =
    `polygon(0 0, calc(100% - ${ch}px) 0, 100% ${ch}px, 100% 100%, ${ch}px 100%, 0 calc(100% - ${ch}px))`;

  const emblSize = Math.round(px * sc.emblPct);

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{
        width:  px,
        height: px,
        filter: visual.glow,
      }}
    >
      <div
        style={{
          width:           px,
          height:          px,
          background:      visual.bg,
          clipPath,
          boxShadow:       `inset 0 0 0 ${sc.border}px ${visual.frame}`,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
        }}
      >
        {TIER_EMBLEMS[name]({ size: emblSize, color: visual.ink })}
      </div>
    </div>
  );
}

// ── Display helpers ──────────────────────────────────────────────────────────

export function getTierDisplayName(tier: string | number): string {
  const name =
    typeof tier === 'number' ? getTierFromScore(tier) : normalizeTierName(String(tier));
  return TIER_VISUAL[name].displayName;
}

export function getTierInkColor(tier: string | number): string {
  const name =
    typeof tier === 'number' ? getTierFromScore(tier) : normalizeTierName(String(tier));
  return TIER_VISUAL[name].ink;
}
