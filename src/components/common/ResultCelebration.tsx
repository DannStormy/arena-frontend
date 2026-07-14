import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/**
 * Outcome-tiered results hero. The celebration must read as EARNED — a strong
 * round burns bright, a weak one stays subdued (the screen never celebrates a
 * bad result).
 *
 *   • great → an energetic ember victory star-burst: a bright central star with
 *     a radiating ring of twinkling sparks over a warm glow, popping in on mount.
 *   • ok    → calm, neutral: a gently breathing glow with a few slow embers.
 *             Present and warm, but not celebratory.
 *   • poor  → muted / minimal: a single dim, static coal-glow. No sparks, no
 *             confetti, no motion.
 *
 * Cheap by design: only transform + opacity animate (GPU-composited), so it
 * holds 60fps on low-end Android. prefers-reduced-motion collapses every tier to
 * a calm static state (see .rc-* rules in index.css). Warm EMBER palette only.
 *
 * Renders as a normal-flow block (fixed height) so a rank/XP progress bar can be
 * stacked directly beneath it by the caller.
 */

export type CelebrationTier = 'great' | 'ok' | 'poor';

/**
 * Tier thresholds (by accuracy %):
 *   great ≥ 80   ·   ok 40–79   ·   poor < 40
 */
export function tierFromAccuracy(accuracy: number): CelebrationTier {
  if (accuracy >= 80) return 'great';
  if (accuracy >= 40) return 'ok';
  return 'poor';
}

interface Spark {
  /** Centre position as % of the band (50/50 is dead centre). */
  l: number;
  t: number;
  /** Size in px. */
  s: number;
  color: string;
  /** Twinkle cycle length (s) + stagger (s). */
  dur: number;
  delay: number;
  /** Rest/peak scale + resting opacity — bigger sparks pulse calmer. */
  min: number;
  max: number;
  omin: number;
}

const GOLD = '#FFC93F';
const AMBER = '#F0B05A';
const EMBER = '#E8893B';

// Radiating ring for the 'great' burst — a bright central star with sparks
// fanning outward. Hand-scattered so no two neighbours twinkle in sync.
const GREAT_SPARKS: Spark[] = [
  { l: 50, t: 50, s: 32, color: GOLD, dur: 1.7, delay: 0, min: 0.82, max: 1, omin: 0.85 },
  { l: 24, t: 34, s: 14, color: AMBER, dur: 1.3, delay: 0.15, min: 0.4, max: 1, omin: 0.3 },
  { l: 76, t: 32, s: 15, color: AMBER, dur: 1.5, delay: 0.32, min: 0.4, max: 1, omin: 0.3 },
  { l: 15, t: 62, s: 12, color: EMBER, dur: 1.2, delay: 0.5, min: 0.4, max: 1, omin: 0.3 },
  { l: 85, t: 64, s: 13, color: EMBER, dur: 1.4, delay: 0.22, min: 0.4, max: 1, omin: 0.3 },
  { l: 37, t: 22, s: 9, color: GOLD, dur: 1.1, delay: 0.6, min: 0.35, max: 1, omin: 0.25 },
  { l: 63, t: 20, s: 10, color: GOLD, dur: 1.35, delay: 0.4, min: 0.35, max: 1, omin: 0.25 },
  { l: 31, t: 78, s: 9, color: AMBER, dur: 1.25, delay: 0.3, min: 0.35, max: 1, omin: 0.25 },
  { l: 69, t: 80, s: 8, color: AMBER, dur: 1.15, delay: 0.55, min: 0.35, max: 1, omin: 0.25 },
  { l: 9, t: 44, s: 8, color: EMBER, dur: 1.3, delay: 0.12, min: 0.35, max: 1, omin: 0.25 },
  { l: 91, t: 46, s: 9, color: EMBER, dur: 1.45, delay: 0.48, min: 0.35, max: 1, omin: 0.25 },
];

// Calm 'ok' state — a few slow embers, low and unhurried.
const OK_SPARKS: Spark[] = [
  { l: 34, t: 46, s: 10, color: EMBER, dur: 3, delay: 0, min: 0.6, max: 0.95, omin: 0.4 },
  { l: 62, t: 40, s: 9, color: EMBER, dur: 3.4, delay: 0.8, min: 0.6, max: 0.95, omin: 0.4 },
  { l: 50, t: 62, s: 8, color: AMBER, dur: 3.8, delay: 0.4, min: 0.6, max: 0.9, omin: 0.35 },
];

const GLOW: Record<CelebrationTier, { size: number; color: string; breatheDur: number }> = {
  great: { size: 230, color: 'rgba(240,176,90,0.32)', breatheDur: 2.8 },
  ok: { size: 190, color: 'rgba(232,137,59,0.20)', breatheDur: 4.2 },
  poor: { size: 150, color: 'rgba(157,61,42,0.16)', breatheDur: 0 },
};

// A 4-point sparkle via clip-path — set once in index.css (.rc-spark).
function SparkDots({ sparks }: { sparks: Spark[] }) {
  return (
    <>
      {sparks.map((sp, i) => (
        <span
          key={i}
          className="rc-spark"
          style={
            {
              left: `${sp.l}%`,
              top: `${sp.t}%`,
              width: sp.s,
              height: sp.s,
              background: sp.color,
              boxShadow: `0 0 ${Math.round(sp.s * 0.8)}px ${sp.color}`,
              '--rc-dur': `${sp.dur}s`,
              '--rc-delay': `${sp.delay}s`,
              '--rc-min': sp.min,
              '--rc-max': sp.max,
              '--rc-omin': sp.omin,
            } as CSSProperties
          }
        />
      ))}
    </>
  );
}

interface ResultCelebrationProps {
  tier: CelebrationTier;
  /** Band height in px. */
  height?: number;
  className?: string;
}

export function ResultCelebration({ tier, height = 96, className }: ResultCelebrationProps) {
  const glow = GLOW[tier];

  return (
    <div aria-hidden className={cn('rc', className)} style={{ height }}>
      {/* Warm glow bed — breathes for great/ok, static for poor. */}
      <span
        className={cn('rc-glow', tier !== 'poor' && 'rc-glow-breathe')}
        style={{
          width: glow.size,
          height: glow.size,
          background: `radial-gradient(circle, ${glow.color}, transparent 70%)`,
          animationDuration: glow.breatheDur ? `${glow.breatheDur}s` : undefined,
        }}
      />

      {tier === 'great' && (
        <div className="rc-burst" style={{ position: 'absolute', inset: 0 }}>
          <SparkDots sparks={GREAT_SPARKS} />
        </div>
      )}

      {tier === 'ok' && <SparkDots sparks={OK_SPARKS} />}

      {/* poor: glow only — deliberately minimal. */}
    </div>
  );
}
