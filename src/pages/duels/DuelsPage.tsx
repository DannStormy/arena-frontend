import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus, Swords, ChevronDown, Flame, TrendingDown, Zap, Skull, Flag,
} from 'lucide-react';
import { ARENA_LUCIDE_ICONS } from '@/lib/arena-icons';
import { ModeIcon, ModeIconInline } from '@/components/common/ModeIcon';
import { EMBER, getEmberModeAccent } from '@/lib/ember';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DUEL_MODE_CONFIG, type DuelHistoryItem } from '@/types/duel.types';
import { useDuelHistoryInfinite } from '@/hooks/use-duels';
import { useAuthStore } from '@/stores/auth.store';
import { ARENA_CONFIG } from '@/lib/arena-config';

// ── Motion helpers ─────────────────────────────────────────────────────────────

function useReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function useCountUp(target: number, duration = 400): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced) { setValue(target); return; }
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    let rafId: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setValue(Math.round(t * target));
      if (t < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration, reduced]);

  return value;
}

function FadeRise({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) { setVisible(true); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [reduced]);

  return (
    <div
      ref={ref}
      className={visible ? 'animate-card-rise' : ''}
      style={{
        opacity: visible ? undefined : 0,
        animationDelay: visible ? `${delay}ms` : undefined,
        animationFillMode: 'both',
      }}
    >
      {children}
    </div>
  );
}

// ── Shared score logic ─────────────────────────────────────────────────────────

function deriveCard(item: DuelHistoryItem, myId: string | undefined) {
  const amChallenger = item.challengerId === myId;
  const myScore    = amChallenger ? item.challengerScore : item.opponentScore;
  const theirScore = amChallenger ? item.opponentScore   : item.challengerScore;
  const myName     = (amChallenger ? item.challengerUsername : item.opponentUsername) ?? 'You';
  const opponentName =
    (amChallenger ? item.opponentUsername : item.challengerUsername) ??
    (amChallenger ? item.opponentId      : item.challengerId)?.slice(0, 8) ??
    'Opponent';

  const scoresEqual        = myScore === theirScore;
  const myScoreIsWinner    = !scoresEqual && item.winnerId === myId;
  const theirScoreIsWinner = !scoresEqual && item.winnerId !== null && item.winnerId !== myId;

  const outcome: 'win' | 'loss' | 'tie' | null = item.isTie
    ? 'tie'
    : item.winnerId === myId
      ? 'win'
      : item.winnerId !== null ? 'loss' : null;

  const isFree = parseFloat(item.stake || '0') === 0;
  const isLive = item.status === 'pending' || item.status === 'active';

  return { myScore, theirScore, myName, opponentName, scoresEqual, myScoreIsWinner, theirScoreIsWinner, outcome, isFree, isLive };
}

// ── Inter-game streak ──────────────────────────────────────────────────────────

function computeStreak(
  items: DuelHistoryItem[],
  myId: string | undefined,
): { streakLen: number; streakType: 'W' | 'L' | null } {
  const completed = items.filter((i) => i.status === 'completed');
  if (!completed.length || !myId) return { streakLen: 0, streakType: null };

  let streakType: 'W' | 'L' | null = null;
  let streakLen = 0;

  for (const item of completed) {
    if (item.isTie) break;
    const o: 'W' | 'L' = item.winnerId === myId ? 'W' : 'L';
    if (streakType === null) {
      streakType = o;
      streakLen = 1;
    } else if (o === streakType) {
      streakLen++;
    } else {
      break;
    }
  }

  return { streakLen, streakType };
}

// ── Contextual reaction line ───────────────────────────────────────────────────

function getReactionLine({
  outcome,
  resolution,
  margin,
  streakLen,
  streakType,
}: {
  outcome: 'win' | 'loss' | 'tie' | null;
  resolution?: string;
  margin: number;
  streakLen: number;
  streakType: 'W' | 'L' | null;
}): string | null {
  if (!outcome || outcome === 'tie') return null;

  // 1. Streak
  if (outcome === 'win' && streakLen >= 3 && streakType === 'W') return 'Still unbeaten.';

  // 2. Resolution
  if (resolution === 'sudden_death') return outcome === 'win' ? 'Clutch.' : 'Heartbreaker.';
  if (resolution === 'speed_tiebreak') return outcome === 'win' ? 'Too quick for them.' : 'Pipped at the line.';

  // 3. Margin
  if (outcome === 'loss' && margin <= 1) return 'So close.';
  if (outcome === 'win'  && margin >= 4) return 'Not even close.';

  // 4. Fallback
  return outcome === 'win' ? 'Nice one.' : "Next one's yours.";
}

// ── Resolution tag ─────────────────────────────────────────────────────────────

function ResolutionTag({
  resolution,
  outcome,
}: {
  resolution?: string;
  outcome?: 'win' | 'loss' | 'tie' | null;
}) {
  if (!resolution || resolution === 'score') return null;

  let icon: React.ReactNode = null;
  let label = '';

  if (resolution === 'speed_tiebreak') {
    icon = <Zap className="h-2.5 w-2.5" />;
    label = outcome === 'win' ? 'Won on speed' : outcome === 'loss' ? 'Lost on speed' : 'Speed tiebreak';
  } else if (resolution === 'sudden_death') {
    icon = <Skull className="h-2.5 w-2.5" />;
    label = 'Sudden death';
  } else if (resolution === 'forfeit') {
    icon = <Flag className="h-2.5 w-2.5" />;
    label = outcome === 'win' ? 'Won by forfeit' : outcome === 'loss' ? 'Lost by forfeit' : 'Forfeit';
  } else if (resolution === 'draw') {
    label = 'Draw';
  } else return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-px clip-chip text-[9px] font-semibold uppercase tracking-wider shrink-0"
      style={{
        background: 'rgba(240,232,220,0.06)',
        color: EMBER.textTertiary,
        border: '1px solid rgba(240,232,220,0.08)',
      }}
    >
      {icon}
      {label}
    </span>
  );
}

// ── Outcome badges ─────────────────────────────────────────────────────────────

const BADGE_BASE: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 10px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '1px',
  lineHeight: 1,
};

const BADGE_SM: React.CSSProperties = {
  ...BADGE_BASE,
  padding: '2px 6px',
  fontSize: '9px',
  letterSpacing: '0.8px',
};

function OutcomeBadge({
  outcome,
  isLive,
  size = 'md',
  shimmer = false,
}: {
  outcome: 'win' | 'loss' | 'tie' | null;
  isLive: boolean;
  size?: 'md' | 'sm';
  shimmer?: boolean;
}) {
  const base = size === 'sm' ? BADGE_SM : BADGE_BASE;

  if (isLive) {
    return (
      <span className="flex items-center gap-1.5 font-display clip-chip" style={{ ...base, background: 'rgba(232,137,59,0.15)', border: `1px solid ${EMBER.accent}55`, color: EMBER.accent }}>
        <span className="h-1.5 w-1.5 rounded-full animate-pulse shrink-0" style={{ background: EMBER.accent }} />
        LIVE
      </span>
    );
  }
  if (outcome === 'win') {
    return (
      <span
        className={`font-display clip-chip${shimmer ? ' animate-hero-shimmer' : ''}`}
        style={{
          ...base,
          background: shimmer
            ? `linear-gradient(90deg, ${EMBER.winBg}, rgba(240,176,90,0.32), ${EMBER.winBg})`
            : EMBER.winBg,
          border: `1px solid ${EMBER.winBorder}`,
          color: EMBER.win,
        }}
      >
        WON
      </span>
    );
  }
  if (outcome === 'loss') {
    return (
      <span
        className="font-display clip-chip"
        style={{
          display: 'inline-block',
          background: 'rgba(138,51,36,0.18)',
          boxShadow: 'inset 0 0 0 1px rgba(138,51,36,0.5)',
          color: '#d98a6f',
          padding: size === 'sm' ? '2px 6px' : '5px 11px',
          fontSize: size === 'sm' ? '9px' : '10.5px',
          fontWeight: 700,
          letterSpacing: size === 'sm' ? '0.8px' : '1.6px',
          lineHeight: 1,
          textTransform: 'uppercase',
        }}
      >
        LOST
      </span>
    );
  }
  if (outcome === 'tie') {
    return (
      <span className="font-display clip-chip" style={{ ...base, background: 'rgba(240,232,220,0.06)', border: '1px solid rgba(240,232,220,0.15)', color: 'rgba(240,232,220,0.45)' }}>
        TIE
      </span>
    );
  }
  return null;
}

// ── Payout node ────────────────────────────────────────────────────────────────

function PayoutNode({ item, outcome }: { item: DuelHistoryItem; outcome: 'win' | 'loss' | 'tie' | null }) {
  const isFree = parseFloat(item.stake || '0') === 0;
  if (isFree) {
    return (
      <span className="px-1.5 py-px rounded text-[9px] font-semibold uppercase tracking-wider" style={{ background: 'rgba(240,232,220,0.05)', color: EMBER.textTertiary, border: '1px solid rgba(240,232,220,0.07)' }}>
        Free play
      </span>
    );
  }
  if (outcome === 'win') {
    return <span className="text-[11px] font-semibold leading-none" style={{ color: EMBER.win }}>+₦{item.prizeWon ?? item.stake}</span>;
  }
  if (outcome === 'loss') {
    return <span className="text-[11px] font-semibold leading-none" style={{ color: EMBER.loss }}>−₦{item.stake}</span>;
  }
  return <span className="text-[11px] leading-none" style={{ color: EMBER.textTertiary }}>₦{item.stake}</span>;
}

// ── Hero avatar ────────────────────────────────────────────────────────────────

function HeroVsAvatar({
  name,
  isWinner,
  isNeutral,
}: {
  name: string;
  isWinner: boolean;
  isNeutral: boolean;
}) {
  const initials = name.slice(0, 2).toUpperCase();

  if (isWinner && !isNeutral) {
    return (
      <div
        className="h-12 w-12 flex items-center justify-center text-sm font-bold select-none animate-winner-glow clip-avatar"
        style={{
          background: 'linear-gradient(150deg, #E8893B, #C2541E)',
          color: '#F8FAFC',
        }}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className="h-12 w-12 flex items-center justify-center text-sm font-bold shrink-0 select-none clip-avatar"
      style={{
        background: 'linear-gradient(150deg, #3a342c, #26221d)',
        color: EMBER.textTertiary,
      }}
    >
      {initials}
    </div>
  );
}

// ── Hero score column ──────────────────────────────────────────────────────────

function HeroScoreColumn({
  name,
  score,
  isWinner,
  isNeutral,
}: {
  name: string;
  score: number;
  isMe: boolean;
  isWinner: boolean;
  isNeutral: boolean;
  modeAccent: string;
}) {
  const displayed = useCountUp(score, 500);
  const colOpacity = !isNeutral && !isWinner ? 0.46 : 1;
  const scoreColor = isNeutral
    ? 'rgba(240,232,220,0.52)'
    : isWinner
      ? '#F8FAFC'
      : 'rgba(240,232,220,0.40)';

  return (
    <div className="flex flex-col items-center" style={{ gap: 9, opacity: colOpacity, transition: 'opacity 0.3s ease' }}>
      <HeroVsAvatar name={name} isWinner={isWinner} isNeutral={isNeutral} />
      <span className="text-[11px] font-medium max-w-[90px] truncate text-center leading-none" style={{ color: EMBER.textTertiary }}>
        {name}
      </span>
      <span
        className="font-display leading-none"
        style={{
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: '-2px',
          fontFeatureSettings: '"tnum"',
          color: scoreColor,
        }}
      >
        {displayed}
      </span>
    </div>
  );
}

// ── Hero card ─────────────────────────────────────────────────────────────────

function HeroCard({
  item,
  myId,
  onClick,
  streakLen,
  streakType,
}: {
  item: DuelHistoryItem;
  myId: string | undefined;
  onClick: () => void;
  streakLen: number;
  streakType: 'W' | 'L' | null;
}) {
  const { myScore, theirScore, myName, opponentName, myScoreIsWinner, theirScoreIsWinner, scoresEqual, outcome, isLive } = deriveCard(item, myId);
  const modeAccent = getEmberModeAccent(item.mode);
  const modeConfig = DUEL_MODE_CONFIG[item.mode];
  const arena      = ARENA_CONFIG[item.arena];
  const reduced    = useReducedMotion();
  const date       = new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const isSD       = item.mode === 'sudden_death';
  const isBlitz    = item.mode === 'blitz';

  const margin = Math.abs(myScore - theirScore);
  const reactionLine = getReactionLine({ outcome, resolution: item.resolution, margin, streakLen, streakType });

  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer transition-[filter,transform] hover:brightness-[1.06] active:scale-[0.99]"
    >
      {/* Card surface — z-index 1 sits above the room-light (which lives in the page wrapper) */}
      <div
        className="relative overflow-hidden hero-card-surface clip-card"
        style={{
          zIndex: 1,
          background:
            'radial-gradient(120% 90% at 72% 8%, rgba(232,137,59,0.07), transparent 58%), #120F0C',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
          padding: '30px 24px 26px',
        }}
      >
        {/* 3px mode-accent left bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: modeAccent }} />

        {/* Sudden Death: pulsing inset glow */}
        {isSD && !reduced && (
          <div className="absolute inset-0 rounded-[inherit] pointer-events-none animate-sd-pulse" />
        )}

        {/* Blitz: diagonal warm-amber streak, one-time draw-in */}
        {isBlitz && (
          <div className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none">
            <div
              className={reduced ? '' : 'animate-blitz-streak'}
              style={{
                position: 'absolute',
                top: -50,
                right: -40,
                width: 160,
                height: 240,
                background: `linear-gradient(140deg, transparent 20%, ${modeAccent}10 45%, ${modeAccent}1C 55%, transparent 74%)`,
                transform: 'rotate(-4deg)',
              }}
            />
          </div>
        )}

        <div className="flex flex-col gap-3">
          {/* Row 1: mode label | outcome badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ModeIcon mode={item.mode} size={24} iconSize={12} accent={modeAccent} clip />
              <span className="font-display font-bold text-[11px] tracking-[0.12em] uppercase" style={{ color: modeAccent }}>
                {modeConfig.label}
              </span>
            </div>
            <OutcomeBadge outcome={outcome} isLive={isLive} shimmer={outcome === 'win' && !reduced} />
          </div>

          {/* Row 2: VS layout */}
          <div className="grid items-center" style={{ gridTemplateColumns: '1fr auto 1fr', margin: '16px 0' }}>
            <div className="flex justify-center">
              <HeroScoreColumn name={myName} score={myScore} isMe isWinner={myScoreIsWinner} isNeutral={scoresEqual} modeAccent={modeAccent} />
            </div>

            <div className="flex items-center justify-center self-center px-3">
              <span
                className="font-display font-bold italic select-none"
                style={{ fontSize: 25, color: EMBER.vsInk, transform: 'skewX(-9deg)', display: 'inline-block' }}
              >
                VS
              </span>
            </div>

            <div className="flex justify-center">
              <HeroScoreColumn name={opponentName} score={theirScore} isMe={false} isWinner={theirScoreIsWinner} isNeutral={scoresEqual} modeAccent={modeAccent} />
            </div>
          </div>

          {/* Reaction line — the card's voice */}
          {reactionLine && (
            <p
              className="text-center font-sans italic text-[12px] leading-none"
              style={{ color: 'rgba(240,232,220,0.44)' }}
            >
              {reactionLine}
            </p>
          )}

          {/* Diagonal slash divider — full card width, anchored to panel edges */}
          <div className="vs-slash-line animate-slash-energy" style={{ marginLeft: '-24px', marginRight: '-24px' }} />

          {/* Row 3: meta */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="flex items-center" style={{ fontSize: 11, color: EMBER.textTertiary }}>
              {ARENA_LUCIDE_ICONS[item.arena] ?? null}
            </span>
            <span className="text-[11px] leading-none ml-0.5" style={{ color: EMBER.textTertiary }}>
              {arena?.label ?? item.arena}
            </span>
            <span className="text-[11px] mx-0.5" style={{ color: 'rgba(240,232,220,0.18)' }}>·</span>
            <span className="text-[11px] leading-none" style={{ color: EMBER.textTertiary }}>{date}</span>
            <span className="text-[11px] mx-0.5" style={{ color: 'rgba(240,232,220,0.18)' }}>·</span>
            <PayoutNode item={item} outcome={outcome} />
            {item.resolution && item.resolution !== 'score' && (
              <>
                <span className="text-[11px] mx-0.5" style={{ color: 'rgba(240,232,220,0.18)' }}>·</span>
                <ResolutionTag resolution={item.resolution} outcome={outcome} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Compressed archive row ─────────────────────────────────────────────────────

function CompressedRow({ item, myId, onClick }: { item: DuelHistoryItem; myId: string | undefined; onClick: () => void }) {
  const { myScore, theirScore, opponentName, myScoreIsWinner, theirScoreIsWinner, scoresEqual, outcome, isLive } = deriveCard(item, myId);
  const modeAccent = getEmberModeAccent(item.mode);
  const modeConfig = DUEL_MODE_CONFIG[item.mode];

  const outcomeBarColor =
    outcome === 'win'  ? EMBER.accentBright :
    outcome === 'loss' ? EMBER.loss         :
    isLive             ? EMBER.accent       : 'transparent';

  const myScoreStyle: React.CSSProperties = myScoreIsWinner
    ? { fontWeight: 700, color: EMBER.textPrimary }
    : theirScoreIsWinner
      ? { fontWeight: 400, color: EMBER.textPrimary, opacity: 0.35 }
      : { fontWeight: 600, color: 'rgba(240,232,220,0.50)' };

  const theirScoreStyle: React.CSSProperties = theirScoreIsWinner
    ? { fontWeight: 700, color: EMBER.textPrimary }
    : myScoreIsWinner
      ? { fontWeight: 400, color: EMBER.textPrimary, opacity: 0.35 }
      : { fontWeight: 600, color: 'rgba(240,232,220,0.50)' };

  return (
    <div
      onClick={onClick}
      className="relative clip-row cursor-pointer overflow-hidden active:scale-[0.99] flex flex-col transition-[filter] hover:brightness-[1.08]"
      style={{
        minHeight: 44,
        background: EMBER.surface,
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: outcomeBarColor }} />

      {/* Main row */}
      <div className="pl-4 pr-3 flex items-center gap-2 w-full min-h-[44px]">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <ModeIconInline mode={item.mode} size={12} accent={modeAccent} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] shrink-0" style={{ color: modeAccent }}>
            {modeConfig.label}
          </span>
          <span className="text-[10px] truncate min-w-0" style={{ color: EMBER.textTertiary }}>
            vs {opponentName}
          </span>
        </div>

        {/* Score + badge — 2-col fixed grid; tag moved to second line */}
        <div
          className="grid shrink-0 items-center"
          style={{ gridTemplateColumns: '60px 40px', columnGap: '4px' }}
        >
          {/* Score — 60px, right-aligned, tabular nums */}
          <div className="flex items-center justify-end gap-[3px]">
            <span className="font-display text-[17px] leading-none tabular-nums" style={theirScoreStyle}>
              {theirScore}
            </span>
            <span className="text-xs select-none" style={{ color: 'rgba(240,232,220,0.22)' }}>–</span>
            <span className="font-display text-[17px] leading-none tabular-nums" style={myScoreStyle}>
              {myScore}
            </span>
          </div>
          {/* Badge — 40px */}
          <div className="flex justify-center">
            <OutcomeBadge outcome={outcome} isLive={isLive} size="sm" />
          </div>
        </div>
      </div>

      {/* Second line: resolution tag — right-aligned, full text, no overflow clip */}
      {item.resolution && item.resolution !== 'score' && (
        <div className="pl-4 pr-3 pb-1.5 flex justify-end">
          <ResolutionTag resolution={item.resolution} outcome={outcome} />
        </div>
      )}
    </div>
  );
}

// ── Form strip ─────────────────────────────────────────────────────────────────

function FormStrip({ items, myId }: { items: DuelHistoryItem[]; myId: string | undefined }) {
  const completed = items.filter((i) => i.status === 'completed');
  const last5 = completed.slice(0, 5);

  const outcomes = last5
    .map((item) => {
      if (item.isTie) return 'T' as const;
      if (item.winnerId === myId) return 'W' as const;
      if (item.winnerId !== null) return 'L' as const;
      return null;
    })
    .filter((o): o is 'W' | 'L' | 'T' => o !== null);

  if (!outcomes.length) return null;

  let streakLen = 1;
  for (let i = 1; i < outcomes.length; i++) {
    if (outcomes[i] === outcomes[0]) streakLen++;
    else break;
  }
  const streakType = outcomes[0];
  const showPill   = streakLen >= 3 && streakType !== 'T';

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {outcomes.map((o, i) => (
          <span
            key={i}
            className="h-[20px] w-[20px] clip-chip-sm flex items-center justify-center text-[9px] font-bold font-display"
            style={{
              background: o === 'W' ? EMBER.winBg  : o === 'L' ? EMBER.lossBg  : 'rgba(240,232,220,0.06)',
              color:      o === 'W' ? EMBER.win     : o === 'L' ? EMBER.loss    : 'rgba(240,232,220,0.35)',
              border: `1px solid ${o === 'W' ? EMBER.winBorder : o === 'L' ? EMBER.lossBorder : 'rgba(240,232,220,0.08)'}`,
            }}
          >
            {o}
          </span>
        ))}
      </div>
      {showPill && (
        <span
          className="flex items-center gap-1 text-[11px] font-semibold"
          style={{ color: streakType === 'W' ? EMBER.accentBright : EMBER.loss }}
        >
          {/* Flame icon is literally fire — it belongs here */}
          {streakType === 'W' ? <Flame className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {streakLen}-{streakType === 'W' ? 'win' : 'loss'} streak
        </span>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function DuelsPage() {
  const navigate    = useNavigate();
  const [code, setCode]          = useState('');
  const [showCodeInput, setShow] = useState(false);
  const myId        = useAuthStore((s) => s.user?.id);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useDuelHistoryInfinite();
  const items        = data?.pages.flatMap((p) => p.data) ?? [];
  const heroItem     = items[0];
  const archiveItems = items.slice(1);

  const { streakLen, streakType } = computeStreak(items, myId);
  const heroCard = heroItem ? deriveCard(heroItem, myId) : null;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const go = (item: DuelHistoryItem) => {
    if (item.status === 'active')       navigate(`/duels/${item.id}/play`);
    else if (item.status === 'pending') navigate(`/duels/${item.code}/waiting`);
    else                                navigate(`/duels/${item.id}/result`);
  };

  return (
    // .duels-ember scopes the CSS custom properties defined in index.css
    <div className="duels-ember flex flex-col min-h-full" style={{ background: EMBER.base }}>
      <PageHeader
        title="Duels"
        action={
          <Link
            to="/duels/create"
            className="flex items-center gap-1.5 clip-chip px-3 py-1.5 text-sm font-semibold transition-[filter] hover:brightness-110"
            style={{ background: 'rgba(232,137,59,0.08)', color: EMBER.accent, border: '1px solid rgba(232,137,59,0.22)' }}
          >
            <Plus className="h-4 w-4" />
            New duel
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-[640px] px-4 pb-4 space-y-4">
        {/* Code-join — collapsed by default */}
        <div>
          {!showCodeInput ? (
            <button
              onClick={() => setShow(true)}
              className="flex items-center gap-1 text-[12px] font-medium transition-colors"
              style={{ color: EMBER.textTertiary }}
              onMouseEnter={(e) => (e.currentTarget.style.color = EMBER.textSecondary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = EMBER.textTertiary)}
            >
              <ChevronDown className="h-3.5 w-3.5" />
              Have a code?
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter duel code"
                maxLength={8}
                autoFocus
                className="flex-1 rounded-xl px-3 py-2 text-sm font-mono tracking-wider outline-none transition-colors"
                style={{
                  background: EMBER.surface,
                  border: `1px solid ${EMBER.border}`,
                  color: EMBER.textPrimary,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = EMBER.accent;
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(232,137,59,0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = EMBER.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                onClick={() => { const t = code.trim().toUpperCase(); if (t) navigate(`/duels/${t}`); }}
                disabled={!code.trim()}
                className="rounded-xl px-4 py-2 text-sm font-semibold shrink-0 transition-[filter] hover:brightness-110 disabled:opacity-40"
                style={{ background: EMBER.accentDeep, color: EMBER.textPrimary }}
              >
                Join
              </button>
            </div>
          )}
        </div>

        {/* Feed */}
        <section className="space-y-5">
          {isLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : !items.length ? (
            <EmptyState icon={<Swords />} title="No duels yet" description="Challenge someone to get started" />
          ) : (
            <>
              {/* Latest result — hero */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: EMBER.textTertiary }}>
                    Latest result
                  </p>
                  <FormStrip items={items} myId={myId} />
                </div>

                {/* Hero wrapper — room-light sits here as z-0, card renders at z-1 */}
                <div className="relative">
                  <div className="hero-room-light" />
                  <div className="hero-room-drift" />
                  <HeroCard
                    item={heroItem}
                    myId={myId}
                    onClick={() => go(heroItem)}
                    streakLen={streakLen}
                    streakType={streakType}
                  />
                </div>

                {/* Run it back — only for completed duels */}
                {heroCard && !heroCard.isLive && heroItem.status === 'completed' && (
                  <div className="flex gap-2 mt-2.5">
                    {/*
                      Rematch navigates to create with mode prefilled.
                      Note: opponent-prefill (challenge-by-username) needs a BE endpoint
                      (POST /duels with { mode, opponentId }) — not yet available.
                      The user shares the generated code with their opponent manually.
                    */}
                    <div className="duel-btn-wrap is-primary">
                      <button
                        onClick={() => navigate('/duels/create', { state: { mode: heroItem.mode } })}
                        className="duel-btn-primary"
                      >
                        Rematch {heroCard.opponentName}
                      </button>
                    </div>
                    <div className="duel-btn-wrap">
                      <button
                        onClick={() => navigate('/duels/create')}
                        className="duel-btn-secondary"
                      >
                        New duel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Earlier — compressed archive */}
              {archiveItems.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: EMBER.textTertiary }}>
                    Earlier
                  </p>
                  <div className="space-y-1.5">
                    {archiveItems.map((item, idx) => (
                      <FadeRise key={item.id} delay={Math.min(idx, 8) * 40}>
                        <CompressedRow item={item} myId={myId} onClick={() => go(item)} />
                      </FadeRise>
                    ))}
                  </div>
                </div>
              )}

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="pt-2 pb-2 flex justify-center">
                {isFetchingNextPage ? (
                  <LoadingSpinner />
                ) : !hasNextPage ? (
                  <span className="text-[11px] font-medium tracking-wider uppercase" style={{ color: 'rgba(240,232,220,0.18)' }}>
                    All caught up
                  </span>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
