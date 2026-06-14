import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Swords } from 'lucide-react';
import { ARENA_LUCIDE_ICONS } from '@/lib/arena-icons';
import { ModeIcon } from '@/components/common/ModeIcon';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DUEL_MODE_CONFIG, type DuelHistoryItem } from '@/types/duel.types';
import { useDuelHistory } from '@/hooks/use-duels';
import { useAuthStore } from '@/stores/auth.store';
import { ARENA_CONFIG } from '@/lib/arena-config';
import { cn } from '@/lib/utils';


// "You" = brand purple fill; opponent = neutral fill with outcome ring on you
function MatchAvatar({
  name,
  isMe,
  outcome,
}: {
  name: string;
  isMe: boolean;
  outcome: 'win' | 'loss' | 'tie' | null;
}) {
  const bg = isMe ? '#7C5CFF' : '#26262F';
  const fg = isMe ? '#FFFFFF' : '#9A9AA6';

  let ring: React.CSSProperties = {};
  if (isMe && outcome === 'win') {
    ring = { boxShadow: '0 0 0 2px #2DD4A7, 0 0 16px rgba(45,212,167,0.45)' };
  } else if (isMe && outcome === 'loss') {
    ring = { boxShadow: '0 0 0 2px #FF4D5E, 0 0 16px rgba(255,77,94,0.45)' };
  } else if (isMe && outcome === 'tie') {
    ring = { boxShadow: '0 0 0 2px rgba(255,255,255,0.2)' };
  }

  return (
    <div
      className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 select-none"
      style={{ background: bg, color: fg, ...ring }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

interface MatchCardProps {
  item: DuelHistoryItem;
  myId: string | undefined;
  onClick: () => void;
}

function MatchCard({ item, myId, onClick }: MatchCardProps) {
  const arena = ARENA_CONFIG[item.arena];
  const amChallenger = item.challengerId === myId;

  const myScore = amChallenger ? item.challengerScore : item.opponentScore;
  const theirScore = amChallenger ? item.opponentScore : item.challengerScore;

  const myName =
    (amChallenger ? item.challengerUsername : item.opponentUsername) ?? 'You';
  const opponentName =
    (amChallenger ? item.opponentUsername : item.challengerUsername) ??
    (amChallenger ? item.opponentId : item.challengerId)?.slice(0, 8) ??
    'Unknown';

  const outcome = item.isTie
    ? 'tie'
    : item.winnerId === myId
      ? 'win'
      : item.winnerId !== null
        ? 'loss'
        : null;

  const isLive = item.status === 'pending' || item.status === 'active';

  const modeConfig = DUEL_MODE_CONFIG[item.mode];

  const date = new Date(item.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const accentColor =
    outcome === 'win'
      ? '#2DD4A7'
      : outcome === 'loss'
        ? '#FF4D5E'
        : isLive
          ? '#7C5CFF'
          : 'transparent';

  const accentGlow =
    outcome === 'win'
      ? '2px 0 14px 1px rgba(45,212,167,0.45)'
      : outcome === 'loss'
        ? '2px 0 14px 1px rgba(255,77,94,0.45)'
        : 'none';

  // Signed money display
  let moneyText: string;
  let moneyColor: string;
  if (!item.stake || item.stake === '0') {
    moneyText  = 'Free play';
    moneyColor = '#76767F';
  } else if (outcome === 'win') {
    moneyText  = `+₦${item.prizeWon ?? item.stake}`;
    moneyColor = '#2DD4A7';
  } else if (outcome === 'loss') {
    moneyText  = `−₦${item.stake}`;
    moneyColor = '#FF4D5E';
  } else {
    moneyText  = `₦${item.stake}`;
    moneyColor = '#76767F';
  }

  // Second-person on your own screen ("You were faster"); third-person for losses
  const tiebreakFaster = item.tiebreakDeltaMs
    ? item.winnerId === myId ? 'You were' : `${opponentName} was`
    : null;

  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl border border-arena-border bg-arena-surface cursor-pointer overflow-hidden transition-all hover:bg-arena-elev active:scale-[0.99]"
    >
      {/* Left outcome edge — glow only for win/loss */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: accentColor, boxShadow: accentGlow }}
      />

      <div className="pl-5 pr-4 py-[14px] flex flex-col gap-[9px]">
        {/* Row 1: mode chip + label | outcome badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ModeIcon mode={item.mode} size={26} iconSize={13} />
            <span className="font-sans font-medium text-[11px] tracking-[0.09em] uppercase text-arena-text-secondary">
              {modeConfig.label}
            </span>
          </div>
          <OutcomeBadge outcome={outcome} isLive={isLive} />
        </div>

        {/* Row 2: [avatar] myName  myScore — theirScore  opponentName [avatar] */}
        <div className="flex items-center gap-2">
          <MatchAvatar name={myName} isMe outcome={outcome} />
          <span className="text-arena-text-tertiary text-[11px] font-medium max-w-[52px] truncate leading-none">
            {myName}
          </span>

          <div className="flex-1 flex items-center justify-center gap-2">
            <span className="font-display font-bold text-[28px] leading-none tabular-nums text-arena-text-primary">
              {myScore}
            </span>
            <span className="text-white/20 font-bold text-base select-none leading-none">—</span>
            <span className="font-display font-bold text-[28px] leading-none tabular-nums text-white/30">
              {theirScore}
            </span>
          </div>

          <span className="text-arena-text-tertiary text-[11px] font-medium max-w-[52px] truncate text-right leading-none">
            {opponentName}
          </span>
          <MatchAvatar name={opponentName} isMe={false} outcome={outcome} />
        </div>

        {/* Row 3: arena · date · money */}
        <div className="flex items-center gap-1">
          <span className="text-arena-text-tertiary flex items-center" style={{ fontSize: 11 }}>
            {ARENA_LUCIDE_ICONS[item.arena] ?? null}
          </span>
          <span className="text-arena-text-tertiary text-[11px] leading-none ml-0.5">
            {arena?.label ?? item.arena}
          </span>
          <span className="text-white/20 text-[11px] mx-0.5">·</span>
          <span className="text-arena-text-tertiary text-[11px] leading-none">{date}</span>
          <span className="text-white/20 text-[11px] mx-0.5">·</span>
          <span className="text-[11px] font-medium leading-none" style={{ color: moneyColor }}>
            {moneyText}
          </span>
        </div>

        {/* Tiebreaker line — gated: only renders when backend supplies the field */}
        {item.tiebreakDeltaMs && tiebreakFaster ? (
          <div className="flex items-center gap-1 -mt-1">
            <span className="text-arena-text-tertiary text-[10px] leading-none">
              Tiebreaker · {tiebreakFaster} {(item.tiebreakDeltaMs / 1000).toFixed(1)}s faster
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const BADGE_BASE: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 10px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '1px',
  lineHeight: 1,
};

function OutcomeBadge({
  outcome,
  isLive,
}: {
  outcome: 'win' | 'loss' | 'tie' | null;
  isLive: boolean;
}) {
  if (isLive) {
    return (
      <span
        className="flex items-center gap-1.5 font-display"
        style={{
          ...BADGE_BASE,
          background: 'rgba(124,92,255,0.15)',
          border: '1px solid rgba(142,114,255,0.4)',
          color: '#8E72FF',
        }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full animate-pulse shrink-0"
          style={{ background: '#8E72FF' }}
        />
        LIVE
      </span>
    );
  }
  if (outcome === 'win') {
    return (
      <span
        className="font-display"
        style={{
          ...BADGE_BASE,
          background: 'rgba(45,212,167,0.12)',
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
      <span
        className="font-display"
        style={{
          ...BADGE_BASE,
          background: 'rgba(255,77,94,0.12)',
          border: '1px solid #FF4D5E',
          color: '#FF4D5E',
        }}
      >
        LOST
      </span>
    );
  }
  if (outcome === 'tie') {
    return (
      <span
        className="font-display"
        style={{
          ...BADGE_BASE,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.45)',
        }}
      >
        TIE
      </span>
    );
  }
  return null;
}

export function DuelsPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const myId = useAuthStore((s) => s.user?.id);
  const { data: history, isLoading: historyLoading } = useDuelHistory();

  const handleDuelClick = (item: DuelHistoryItem) => {
    if (item.status === 'active') {
      navigate(`/duels/${item.id}/play`);
    } else if (item.status === 'pending') {
      navigate(`/duels/${item.code}/waiting`);
    } else {
      navigate(`/duels/${item.id}/result`);
    }
  };

  const handleJoin = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    navigate(`/duels/${trimmed}`);
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

      <div className="mx-auto w-full max-w-[640px] px-4 space-y-6 pb-4">
        {/* Join by code */}
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter duel code"
            maxLength={8}
            className="bg-arena-surface border-arena-border text-white placeholder:text-white/30 font-mono tracking-wider focus-visible:ring-arena-purple/50 focus-visible:border-arena-purple/60"
          />
          <Button
            onClick={handleJoin}
            disabled={!code.trim()}
            className="bg-arena-purple hover:bg-arena-purple-bright text-white font-semibold shrink-0 transition-colors"
          >
            Join
          </Button>
        </div>

        {/* Duel history */}
        <section>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">
            Recent duels
          </p>

          {historyLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : !history?.data?.length ? (
            <EmptyState
              icon={<Swords />}
              title="No duels yet"
              description="Challenge someone to get started"
            />
          ) : (
            <div className="space-y-3">
              {history.data.map((item) => (
                <MatchCard
                  key={item.id}
                  item={item}
                  myId={myId}
                  onClick={() => handleDuelClick(item)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
