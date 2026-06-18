import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus, Swords, ChevronDown, Flame, TrendingDown, Zap, Skull, Flag,
} from 'lucide-react';
import { ARENA_LUCIDE_ICONS } from '@/lib/arena-icons';
import { getModeAccent, ModeIcon, ModeIconInline } from '@/components/common/ModeIcon';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

// Fades + rises a child in when it enters the viewport; stagger via delay.
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

  const scoresEqual      = myScore === theirScore;
  const myScoreIsWinner  = !scoresEqual && item.winnerId === myId;
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
      className="inline-flex items-center gap-1 px-1.5 py-px rounded text-[9px] font-semibold uppercase tracking-wider shrink-0"
      style={{
        background: 'rgba(255,255,255,0.06)',
        color: 'rgba(255,255,255,0.40)',
        border: '1px solid rgba(255,255,255,0.08)',
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
  borderRadius: '4px',
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
      <span className="flex items-center gap-1.5 font-display" style={{ ...base, background: 'rgba(124,92,255,0.15)', border: '1px solid rgba(142,114,255,0.4)', color: '#8E72FF' }}>
        <span className="h-1.5 w-1.5 rounded-full animate-pulse shrink-0" style={{ background: '#8E72FF' }} />
        LIVE
      </span>
    );
  }
  if (outcome === 'win') {
    return (
      <span
        className={`font-display${shimmer ? ' animate-hero-shimmer' : ''}`}
        style={{
          ...base,
          background: shimmer
            ? 'linear-gradient(90deg, rgba(45,212,167,0.10), rgba(45,212,167,0.30), rgba(45,212,167,0.10))'
            : 'rgba(45,212,167,0.12)',
          border: '1px solid #2DD4A7',
          color: '#2DD4A7',
        }}
      >
        WON
      </span>
    );
  }
  if (outcome === 'loss') {
    return (
      <span className="font-display" style={{ ...base, background: 'rgba(255,77,94,0.12)', border: '1px solid #FF4D5E', color: '#FF4D5E' }}>
        LOST
      </span>
    );
  }
  if (outcome === 'tie') {
    return (
      <span className="font-display" style={{ ...base, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.45)' }}>
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
      <span className="px-1.5 py-px rounded text-[9px] font-semibold uppercase tracking-wider" style={{ background: 'rgba(255,255,255,0.05)', color: '#5E5E6B', border: '1px solid rgba(255,255,255,0.07)' }}>
        Free play
      </span>
    );
  }
  if (outcome === 'win') {
    return <span className="text-[11px] font-semibold leading-none" style={{ color: '#2DD4A7' }}>+₦{item.prizeWon ?? item.stake}</span>;
  }
  if (outcome === 'loss') {
    return <span className="text-[11px] font-semibold leading-none" style={{ color: '#FF4D5E' }}>−₦{item.stake}</span>;
  }
  return <span className="text-[11px] leading-none" style={{ color: '#76767F' }}>₦{item.stake}</span>;
}

// ── Hero card — VS staged ──────────────────────────────────────────────────────

function HeroVsAvatar({
  name,
  isMe,
  isWinner,
  isNeutral,
  modeAccent,
}: {
  name: string;
  isMe: boolean;
  isWinner: boolean;
  isNeutral: boolean;
  modeAccent: string;
}) {
  const initials  = name.slice(0, 2).toUpperCase();
  const avatarBg  = isMe ? '#7C5CFF' : '#26262F';
  const avatarFg  = isMe ? '#FFFFFF' : '#9A9AA6';
  const innerBg   = isMe ? '#4A36C8' : '#1C1928';

  if (isWinner && !isNeutral) {
    return (
      <div style={{ padding: 2, background: `linear-gradient(135deg, #7C3AED, ${modeAccent})`, borderRadius: '50%', boxShadow: `0 0 22px ${modeAccent}50` }}>
        <div className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold select-none" style={{ background: innerBg, color: avatarFg }}>
          {initials}
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 select-none"
      style={{ background: avatarBg, color: avatarFg, boxShadow: isNeutral ? '0 0 0 2px rgba(255,255,255,0.12)' : undefined }}
    >
      {initials}
    </div>
  );
}

function HeroScoreColumn({
  name,
  score,
  isMe,
  isWinner,
  isNeutral,
  modeAccent,
}: {
  name: string;
  score: number;
  isMe: boolean;
  isWinner: boolean;
  isNeutral: boolean;
  modeAccent: string;
}) {
  const displayed = useCountUp(score, 400);
  const colOpacity = !isNeutral && !isWinner ? 0.42 : 1;
  const scoreStyle: React.CSSProperties = isNeutral
    ? { fontWeight: 700, color: 'rgba(255,255,255,0.52)' }
    : isWinner
      ? { fontWeight: 800, color: '#F5F5F7' }
      : { fontWeight: 400, color: 'rgba(255,255,255,0.40)' };

  return (
    <div className="flex flex-col items-center gap-1" style={{ opacity: colOpacity, transition: 'opacity 0.3s ease' }}>
      <HeroVsAvatar name={name} isMe={isMe} isWinner={isWinner} isNeutral={isNeutral} modeAccent={modeAccent} />
      <span className="text-[11px] text-arena-text-tertiary font-medium max-w-[90px] truncate text-center leading-none">
        {name}
      </span>
      <span className="font-display text-[52px] leading-none tabular-nums" style={scoreStyle}>
        {displayed}
      </span>
    </div>
  );
}

function HeroCard({ item, myId, onClick }: { item: DuelHistoryItem; myId: string | undefined; onClick: () => void }) {
  const { myScore, theirScore, myName, opponentName, myScoreIsWinner, theirScoreIsWinner, scoresEqual, outcome, isLive } = deriveCard(item, myId);
  const modeAccent = getModeAccent(item.mode);
  const modeConfig = DUEL_MODE_CONFIG[item.mode];
  const arena      = ARENA_CONFIG[item.arena];
  const reduced    = useReducedMotion();
  const date       = new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const isSD       = item.mode === 'sudden_death';
  const isBlitz    = item.mode === 'blitz';

  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl cursor-pointer overflow-hidden transition-all hover:brightness-[1.06] active:scale-[0.99]"
      style={{
        background: `linear-gradient(135deg, ${modeAccent}2E 0%, ${modeAccent}0C 36%, transparent 60%), #14121C`,
        border: `0.5px solid ${modeAccent}55`,
      }}
    >
      {/* 3px mode-accent left bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: modeAccent }} />

      {/* Sudden Death: animated inset border pulse */}
      {isSD && !reduced && (
        <div className="absolute inset-0 rounded-[inherit] pointer-events-none animate-sd-pulse" />
      )}

      {/* Blitz: diagonal amber streak, one-time draw-in */}
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
              background: `linear-gradient(140deg, transparent 20%, ${modeAccent}12 45%, ${modeAccent}1E 55%, transparent 74%)`,
              transform: 'rotate(-4deg)',
            }}
          />
        </div>
      )}

      {/* Soft mode glow — absolute behind content, outside card overflow */}
      <div
        className="absolute inset-x-0 bottom-0 h-1 blur-2xl pointer-events-none"
        style={{ background: `${modeAccent}30` }}
      />

      <div className="pl-5 pr-4 pt-3 pb-3 flex flex-col gap-2">
        {/* Row 1: mode label | outcome badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ModeIcon mode={item.mode} size={24} iconSize={12} />
            <span className="font-sans font-semibold text-[11px] tracking-[0.1em] uppercase" style={{ color: modeAccent }}>
              {modeConfig.label}
            </span>
          </div>
          <OutcomeBadge outcome={outcome} isLive={isLive} shimmer={outcome === 'win' && !reduced} />
        </div>

        {/* Row 2: VS layout */}
        <div className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
          {/* Me — left */}
          <div className="flex justify-center">
            <HeroScoreColumn name={myName} score={myScore} isMe isWinner={myScoreIsWinner} isNeutral={scoresEqual} modeAccent={modeAccent} />
          </div>

          {/* VS divider */}
          <div className="flex flex-col items-center gap-1 self-center">
            <div className="w-px h-5" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.14), transparent)' }} />
            <span className="font-display text-[13px] font-bold select-none" style={{ color: 'rgba(255,255,255,0.28)', display: 'block', transform: 'skewX(-8deg)' }}>
              VS
            </span>
            <div className="w-px h-5" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.14), transparent)' }} />
          </div>

          {/* Opponent — right */}
          <div className="flex justify-center">
            <HeroScoreColumn name={opponentName} score={theirScore} isMe={false} isWinner={theirScoreIsWinner} isNeutral={scoresEqual} modeAccent={modeAccent} />
          </div>
        </div>

        {/* Row 3: meta */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-arena-text-tertiary flex items-center" style={{ fontSize: 11 }}>
            {ARENA_LUCIDE_ICONS[item.arena] ?? null}
          </span>
          <span className="text-arena-text-tertiary text-[11px] leading-none ml-0.5">
            {arena?.label ?? item.arena}
          </span>
          <span className="text-white/20 text-[11px] mx-0.5">·</span>
          <span className="text-arena-text-tertiary text-[11px] leading-none">{date}</span>
          <span className="text-white/20 text-[11px] mx-0.5">·</span>
          <PayoutNode item={item} outcome={outcome} />
          {item.resolution && item.resolution !== 'score' && (
            <>
              <span className="text-white/20 text-[11px] mx-0.5">·</span>
              <ResolutionTag resolution={item.resolution} outcome={outcome} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Compressed archive row ─────────────────────────────────────────────────────

function CompressedRow({ item, myId, onClick }: { item: DuelHistoryItem; myId: string | undefined; onClick: () => void }) {
  const { myScore, theirScore, opponentName, myScoreIsWinner, theirScoreIsWinner, scoresEqual, outcome, isLive } = deriveCard(item, myId);
  const modeAccent = getModeAccent(item.mode);
  const modeConfig = DUEL_MODE_CONFIG[item.mode];

  const outcomeBarColor =
    outcome === 'win'  ? '#2DD4A7' :
    outcome === 'loss' ? '#FF4D5E' :
    isLive             ? '#7C5CFF' : 'transparent';

  // Smaller score weights for compact display
  const myScoreStyle: React.CSSProperties = myScoreIsWinner
    ? { fontWeight: 700, color: '#F5F5F7' }
    : theirScoreIsWinner
      ? { fontWeight: 400, color: '#FFFFFF', opacity: 0.35 }
      : { fontWeight: 600, color: 'rgba(255,255,255,0.50)' };

  const theirScoreStyle: React.CSSProperties = theirScoreIsWinner
    ? { fontWeight: 700, color: '#F5F5F7' }
    : myScoreIsWinner
      ? { fontWeight: 400, color: '#FFFFFF', opacity: 0.35 }
      : { fontWeight: 600, color: 'rgba(255,255,255,0.50)' };

  return (
    <div
      onClick={onClick}
      className="relative rounded-xl border border-arena-border bg-arena-surface cursor-pointer overflow-hidden transition-all hover:bg-arena-elev active:scale-[0.99] flex items-center"
      style={{ height: 44 }}
    >
      {/* Left outcome bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: outcomeBarColor }} />

      <div className="pl-4 pr-3 flex items-center gap-2 w-full">
        {/* Left: mode + opponent */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <ModeIconInline mode={item.mode} size={12} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] shrink-0" style={{ color: modeAccent }}>
            {modeConfig.label}
          </span>
          <span className="text-arena-text-tertiary text-[10px] truncate min-w-0">
            vs {opponentName}
          </span>
        </div>

        {/* Right: opponent–me score | badge | resolution */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-display text-[17px] leading-none tabular-nums" style={theirScoreStyle}>
            {theirScore}
          </span>
          <span className="text-white/25 text-xs select-none">–</span>
          <span className="font-display text-[17px] leading-none tabular-nums" style={myScoreStyle}>
            {myScore}
          </span>
          <OutcomeBadge outcome={outcome} isLive={isLive} size="sm" />
          <ResolutionTag resolution={item.resolution} outcome={outcome} />
        </div>
      </div>
    </div>
  );
}

// ── Form strip (unchanged) ─────────────────────────────────────────────────────

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
            className="h-[20px] w-[20px] rounded-[5px] flex items-center justify-center text-[9px] font-bold font-display"
            style={{
              background: o === 'W' ? 'rgba(45,212,167,0.14)' : o === 'L' ? 'rgba(255,77,94,0.14)' : 'rgba(255,255,255,0.06)',
              color:      o === 'W' ? '#2DD4A7'               : o === 'L' ? '#FF4D5E'               : 'rgba(255,255,255,0.35)',
              border:    `1px solid ${o === 'W' ? 'rgba(45,212,167,0.25)' : o === 'L' ? 'rgba(255,77,94,0.25)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            {o}
          </span>
        ))}
      </div>
      {showPill && (
        <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: streakType === 'W' ? '#2DD4A7' : '#FF4D5E' }}>
          {streakType === 'W' ? <Flame className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {streakLen}-{streakType === 'W' ? 'win' : 'loss'} streak
        </span>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function DuelsPage() {
  const navigate = useNavigate();
  const [code, setCode]           = useState('');
  const [showCodeInput, setShow]  = useState(false);
  const myId       = useAuthStore((s) => s.user?.id);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useDuelHistoryInfinite();
  const items       = data?.pages.flatMap((p) => p.data) ?? [];
  const heroItem    = items[0];
  const archiveItems = items.slice(1);

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
    if (item.status === 'active')  navigate(`/duels/${item.id}/play`);
    else if (item.status === 'pending') navigate(`/duels/${item.code}/waiting`);
    else navigate(`/duels/${item.id}/result`);
  };

  return (
    <div className="flex flex-col min-h-full bg-arena-bg">
      <PageHeader
        title="Duels"
        action={
          <Link
            to="/duels/create"
            className="flex items-center gap-1.5 rounded-xl bg-arena-purple hover:bg-arena-purple-bright px-3 py-1.5 text-sm font-semibold text-white transition-colors"
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
              className="flex items-center gap-1 text-[12px] font-medium text-arena-text-tertiary hover:text-arena-text-secondary transition-colors"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              Have a code?
            </button>
          ) : (
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter duel code"
                maxLength={8}
                autoFocus
                className="bg-arena-surface border-arena-border text-white placeholder:text-white/30 font-mono tracking-wider focus-visible:ring-arena-purple/50 focus-visible:border-arena-purple/60"
              />
              <Button
                onClick={() => { const t = code.trim().toUpperCase(); if (t) navigate(`/duels/${t}`); }}
                disabled={!code.trim()}
                className="bg-arena-purple hover:bg-arena-purple-bright text-white font-semibold shrink-0 transition-colors"
              >
                Join
              </Button>
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
                  <p className="text-white/30 text-[10px] font-semibold uppercase tracking-[0.14em]">Latest result</p>
                  <FormStrip items={items} myId={myId} />
                </div>
                {/* Soft glow behind hero */}
                <div className="relative">
                  <div
                    className="absolute inset-x-6 -bottom-3 h-6 blur-2xl rounded-full pointer-events-none"
                    style={{ background: `${getModeAccent(heroItem.mode)}28` }}
                  />
                  <HeroCard item={heroItem} myId={myId} onClick={() => go(heroItem)} />
                </div>
              </div>

              {/* Earlier — compressed archive */}
              {archiveItems.length > 0 && (
                <div>
                  <p className="text-white/30 text-[10px] font-semibold uppercase tracking-[0.14em] mb-2">Earlier</p>
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
                  <span className="text-[11px] text-white/20 font-medium tracking-wider uppercase">All caught up</span>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
