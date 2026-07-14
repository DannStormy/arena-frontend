import { useEffect, useRef, useState } from 'react';
import { EMBER } from '@/lib/ember';

/**
 * A level-XP progress bar that animates from `fromInto` → `toInto` (both measured
 * as XP into the current level, 0..span) after mount — the "loader filling" on a
 * results screen. Shows the level and the XP gained; flags a level-up.
 *
 * Purely cosmetic: driven by whatever snapshot the caller passes (the daily's
 * server before→after, or /progression/me for solo). Level ledger only — this is
 * XP/level progress, never season rank (solo never moves rank).
 */
export interface XpLoaderProps {
  level: number;
  fromInto: number;
  toInto: number;
  span: number;
  gained?: number;
  leveledUp?: boolean;
  className?: string;
}

const clampPct = (into: number, span: number) =>
  Math.max(0, Math.min(1, span > 0 ? into / span : 0));

export function XpLoader({
  level,
  fromInto,
  toInto,
  span,
  gained = 0,
  leveledUp = false,
  className,
}: XpLoaderProps) {
  const fromPct = clampPct(fromInto, span);
  const toPct = clampPct(toInto, span);

  const reduced = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  // Start at the "before" fill, then animate to the "after" fill one tick later.
  const [pct, setPct] = useState(reduced.current ? toPct : fromPct);

  useEffect(() => {
    if (reduced.current) return;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setPct(toPct)),
    );
    return () => cancelAnimationFrame(id);
  }, [toPct]);

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between">
        <span
          className="font-display text-xs font-semibold uppercase tracking-[0.12em]"
          style={{ color: leveledUp ? EMBER.accentBright : EMBER.textTertiary }}
        >
          {leveledUp ? `Level up · Level ${level}` : `Level ${level}`}
        </span>
        {gained > 0 && (
          <span className="font-display text-xs font-bold tabular-nums" style={{ color: EMBER.accent }}>
            +{gained.toLocaleString()} XP
          </span>
        )}
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct * 100}%`,
            background: 'linear-gradient(90deg, #C2541E, #F0B05A 70%, #FFD23F)',
            boxShadow: '0 0 10px rgba(232,137,59,0.5)',
            transition: reduced.current ? undefined : 'width 900ms cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      </div>
    </div>
  );
}
