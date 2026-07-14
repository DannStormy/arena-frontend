import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/**
 * "Jumping lights" — a row of vertical ember light bars bouncing like an
 * equalizer, over a soft warm glow bed. The animated celebration hero for the
 * results screens (replaces/augments the old static image).
 *
 * Cheap by design: every bar animates transform: scaleY only (GPU-composited),
 * so it holds 60fps on low-end Android. prefers-reduced-motion collapses the
 * whole row to a calm, static staggered silhouette (see .jl-bar in index.css).
 *
 * Warm EMBER palette only — win burns bright gold, loss cools to crimson,
 * neutral is the base firelight orange.
 */

export type JumpingLightsTone = 'win' | 'loss' | 'neutral';

interface JumpingLightsProps {
  /** Emotional tone — drives the bar colour ramp. */
  tone?: JumpingLightsTone;
  /** Number of bars. Odd counts read best (a clear centre). */
  bars?: number;
  /** Row height in px. */
  height?: number;
  className?: string;
}

// Per-bar timing/shape. Hand-tuned so no two neighbours sync — the row reads
// organic, never a marching wave. Values cycle if `bars` exceeds the list.
const BAR_SHAPE: ReadonlyArray<{ dur: number; delay: number; peak: number; min: number }> = [
  { dur: 0.72, delay: 0.0, peak: 0.66, min: 0.22 },
  { dur: 0.9, delay: 0.14, peak: 0.92, min: 0.3 },
  { dur: 0.64, delay: 0.06, peak: 0.78, min: 0.26 },
  { dur: 1.02, delay: 0.2, peak: 1.0, min: 0.34 },
  { dur: 0.78, delay: 0.1, peak: 0.72, min: 0.24 },
  { dur: 0.86, delay: 0.24, peak: 0.9, min: 0.3 },
  { dur: 0.68, delay: 0.04, peak: 0.6, min: 0.2 },
  { dur: 0.96, delay: 0.18, peak: 0.86, min: 0.28 },
  { dur: 0.74, delay: 0.12, peak: 0.7, min: 0.24 },
];

const TONE_RAMP: Record<JumpingLightsTone, string> = {
  // top → bottom firelight gradients (ember only)
  win: 'linear-gradient(to top, #C2541E 0%, #E8893B 45%, #F0B05A 100%)',
  loss: 'linear-gradient(to top, #5a1c10 0%, #8a3324 50%, #d05a3f 100%)',
  neutral: 'linear-gradient(to top, #C2541E 0%, #E8893B 55%, #F0B05A 100%)',
};

const GLOW: Record<JumpingLightsTone, string> = {
  win: 'radial-gradient(60% 80% at 50% 100%, rgba(240,176,90,0.30), transparent 72%)',
  loss: 'radial-gradient(60% 80% at 50% 100%, rgba(208,90,63,0.22), transparent 72%)',
  neutral: 'radial-gradient(60% 80% at 50% 100%, rgba(232,137,59,0.26), transparent 72%)',
};

export function JumpingLights({
  tone = 'neutral',
  bars = 7,
  height = 72,
  className,
}: JumpingLightsProps) {
  const gradient = TONE_RAMP[tone];
  const barWidth = Math.max(4, Math.round(height / 11));

  return (
    <div
      aria-hidden
      className={cn('relative flex items-end justify-center', className)}
      style={{ height, gap: Math.round(barWidth * 0.9) }}
    >
      {/* Warm glow bed under the bars */}
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{ height: height * 1.3, background: GLOW[tone] }}
      />
      {Array.from({ length: bars }).map((_, i) => {
        const s = BAR_SHAPE[i % BAR_SHAPE.length];
        return (
          <span
            key={i}
            className="jl-bar"
            style={
              {
                width: barWidth,
                height,
                background: gradient,
                borderRadius: barWidth,
                '--jl-dur': `${s.dur}s`,
                '--jl-delay': `${s.delay}s`,
                '--jl-peak': s.peak,
                '--jl-min': s.min,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
