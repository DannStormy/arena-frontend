import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProgressionData } from '@/types/duel.types';

// Durations (ms)
const XP_FILL   = 800;
const FLASH_DUR = 450;
const FAST_FILL = 320;
const SP_GAP    = 400;
const SP_FILL   = 1000;

export function ProgressionReveal({ data }: { data: ProgressionData }) {
  const {
    xpBefore, xpAfter,
    intoLevelBefore, intoLevelAfter, nextLevelAt,
    levelBefore, levelAfter,
    spBefore, spAfter,
    rankBefore, rankAfter, rankFloor, nextRankAt, firstDuelOfDayBonus,
  } = data;

  // Derived: awarded amounts are always after−before
  const xpAwarded           = xpAfter - xpBefore;
  const seasonPointsAwarded = spAfter  - spBefore;

  const reduced = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  const levelsGained = levelAfter - levelBefore;
  const hasRankUp    = rankAfter !== rankBefore;
  const spRange      = Math.max(nextRankAt - rankFloor, 1);

  const finalXpPct  = nextLevelAt > 0 ? (intoLevelAfter  / nextLevelAt) * 100 : 0;
  const startXpPct  = nextLevelAt > 0 ? (intoLevelBefore / nextLevelAt) * 100 : 0;
  // If rank-up, fill from empty in the new rank so the bar never appears to go backwards
  const startSpPct  = hasRankUp ? 0 : ((Math.min(spBefore, nextRankAt) - rankFloor) / spRange) * 100;
  const finalSpPct  = ((Math.min(spAfter,  nextRankAt) - rankFloor) / spRange) * 100;

  const imm = reduced.current;

  const [xpBarPct,    setXpBarPct]    = useState(imm ? finalXpPct        : startXpPct);
  const [xpBarTrans,  setXpBarTrans]  = useState('none');
  const [levelShown,  setLevelShown]  = useState(levelAfter);
  const [flashLevel,  setFlashLevel]  = useState<string | null>(null);
  const [xpDisplay,   setXpDisplay]   = useState(imm ? xpAwarded         : 0);
  const [spBarPct,    setSpBarPct]    = useState(imm ? finalSpPct        : startSpPct);
  const [spBarTrans,  setSpBarTrans]  = useState('none');
  const [spDisplay,   setSpDisplay]   = useState(imm ? seasonPointsAwarded : 0);
  const [rankFlash,   setRankFlash]   = useState<string | null>(null);
  const [settled,     setSettled]     = useState(imm);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafs   = useRef<number[]>([]);

  const clearAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    rafs.current.forEach(cancelAnimationFrame);
    rafs.current = [];
  };

  const jumpToEnd = useCallback(() => {
    clearAll();
    setXpBarPct(finalXpPct);
    setXpBarTrans('none');
    setSpBarPct(finalSpPct);
    setSpBarTrans('none');
    setXpDisplay(xpAwarded);
    setSpDisplay(seasonPointsAwarded);
    setLevelShown(levelAfter);
    setFlashLevel(null);
    setRankFlash(null);
    setSettled(true);
  }, [finalXpPct, finalSpPct, xpAwarded, seasonPointsAwarded, levelAfter]);

  useEffect(() => {
    if (imm) return;

    // All delays are absolute from mount (ms from now when effect runs)
    const at = (delay: number, fn: () => void) => {
      timers.current.push(setTimeout(fn, delay));
    };

    const countUp = (target: number, dur: number, setter: (v: number) => void) => {
      if (target === 0) return;
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - t0) / dur, 1);
        setter(Math.round(target * p));
        if (p < 1) rafs.current.push(requestAnimationFrame(tick));
      };
      rafs.current.push(requestAnimationFrame(tick));
    };

    let c = 300; // cursor (ms from mount)

    // ── XP bar ──────────────────────────────────────────────────────
    // Countup runs for the full XP animation duration
    const totalXpDur = levelsGained === 0
      ? XP_FILL
      : XP_FILL + levelsGained * (FLASH_DUR + 50 + FAST_FILL);
    at(c, () => countUp(xpAwarded, totalXpDur, setXpDisplay));

    if (levelsGained === 0) {
      at(c, () => { setXpBarTrans(`width ${XP_FILL}ms ease-out`); setXpBarPct(finalXpPct); });
      c += XP_FILL;
    } else {
      // Phase 1: fill to 100%
      const fill1 = Math.max(250, ((nextLevelAt - intoLevelBefore) / Math.max(nextLevelAt, 1)) * XP_FILL);
      at(c, () => { setXpBarTrans(`width ${fill1}ms ease-out`); setXpBarPct(100); });
      c += fill1;

      // Chain through each level crossing
      for (let i = 0; i < levelsGained; i++) {
        const newLevel = levelBefore + i + 1;
        const isLast   = i === levelsGained - 1;
        const fillTime = isLast ? XP_FILL : FAST_FILL;

        at(c, () => { setFlashLevel(`Level ${newLevel}!`); setLevelShown(newLevel); });
        c += FLASH_DUR;
        at(c, () => { setFlashLevel(null); setXpBarTrans('none'); setXpBarPct(0); });
        c += 50;
        at(c, () => { setXpBarTrans(`width ${fillTime}ms ease-out`); setXpBarPct(isLast ? finalXpPct : 100); });
        c += fillTime;
      }
    }

    // ── SP bar ──────────────────────────────────────────────────────
    const spStart = c + SP_GAP;
    at(spStart, () => {
      countUp(seasonPointsAwarded, SP_FILL, setSpDisplay);
      setSpBarTrans(`width ${SP_FILL}ms ease-out`);
      setSpBarPct(finalSpPct);
    });

    if (hasRankUp) {
      const rankAt = spStart + Math.max(400, ((finalSpPct) / 100) * SP_FILL * 0.85);
      at(rankAt,        () => setRankFlash(`↑ ${rankAfter}`));
      at(rankAt + 1800, () => setRankFlash(null));
    }

    at(spStart + SP_FILL + 300, () => setSettled(true));

    return clearAll;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="rounded-2xl border border-arena-border bg-arena-surface p-4 space-y-4"
      onClick={settled ? undefined : jumpToEnd}
      style={{ cursor: settled ? 'default' : 'pointer', userSelect: 'none' }}
    >
      {/* XP row */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-[13px] text-arena-text-primary">
              Level {levelShown}
            </span>
            {flashLevel && (
              <span className="font-display font-bold text-[11px] text-arena-purple-bright animate-result-reveal">
                {flashLevel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(firstDuelOfDayBonus ?? 0) > 0 && (
              <span className="text-[10px] text-arena-gold font-semibold bg-arena-gold/10 border border-arena-gold/20 px-2 py-0.5 rounded-full">
                +{firstDuelOfDayBonus} daily
              </span>
            )}
            <span className="font-display font-bold text-[12px] text-arena-purple-bright tabular-nums">
              +{xpDisplay} XP
            </span>
          </div>
        </div>

        <div className="h-[6px] rounded-full bg-arena-elev overflow-hidden">
          <div
            className="h-full rounded-full bg-arena-purple"
            style={{
              width: `${Math.min(Math.max(xpBarPct, 0), 100)}%`,
              transition: xpBarTrans,
            }}
          />
        </div>
      </div>

      {/* Season / rank row — quieter */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-arena-text-secondary text-[11px] font-medium">
              {rankAfter}
            </span>
            {rankFlash && (
              <span className="text-arena-win text-[10px] font-bold animate-result-reveal">
                {rankFlash}
              </span>
            )}
          </div>
          <span className="text-arena-text-tertiary text-[11px] tabular-nums">
            +{spDisplay} pts
          </span>
        </div>

        <div className="h-[4px] rounded-full bg-arena-elev overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(Math.max(spBarPct, 0), 100)}%`,
              transition: spBarTrans,
              background: '#6B6B7A',
            }}
          />
        </div>

        <div className="flex justify-end">
          <span className="text-arena-text-tertiary text-[10px] tabular-nums">
            {spAfter.toLocaleString()} / {nextRankAt.toLocaleString()} to next rank
          </span>
        </div>
      </div>

      {!settled && (
        <p className="text-center text-[10px] text-arena-text-tertiary/40">Tap to skip</p>
      )}
    </div>
  );
}
