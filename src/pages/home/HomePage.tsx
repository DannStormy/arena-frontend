import { Link } from 'react-router-dom';
import { AlertTriangle, LayoutGrid, Check, Swords, ChevronRight, Zap } from 'lucide-react';
import { useTournaments } from '@/hooks/use-tournaments';
import { useDuelHistory } from '@/hooks/use-duels';
import { useUserStats } from '@/hooks/use-user';
import { useAuthStore } from '@/stores/auth.store';
import { ARENA_CONFIG } from '@/lib/arena-config';
import { ARENA_LUCIDE_ICONS } from '@/lib/arena-icons';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer } from '@/components/common/PageContainer';
import { AvatarRing } from '@/components/common/AvatarRing';
import { RankBadge } from '@/components/common/RankBadge';
import { RankBar } from '@/components/common/RankBar';
import { cn } from '@/lib/utils';
import type { Tournament, TournamentArena } from '@/types/tournament.types';
import type { DuelHistoryItem } from '@/types/duel.types';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getOutcome(item: DuelHistoryItem, myId: string): 'win' | 'loss' | 'tie' {
  if (item.isTie) return 'tie';
  if (item.winnerId === myId) return 'win';
  return 'loss';
}

function OutcomePill({ outcome }: { outcome: 'win' | 'loss' | 'tie' }) {
  const label  = outcome === 'win' ? 'W' : outcome === 'loss' ? 'L' : 'D';
  const color  = outcome === 'win' ? '#2DD4A7' : outcome === 'loss' ? '#FF4D5E' : '#76767F';
  const bg     = outcome === 'win' ? 'rgba(45,212,167,0.12)' : outcome === 'loss' ? 'rgba(255,77,94,0.12)' : 'rgba(118,118,127,0.10)';
  const border = outcome === 'win' ? 'rgba(45,212,167,0.4)'  : outcome === 'loss' ? 'rgba(255,77,94,0.4)'  : 'rgba(118,118,127,0.25)';
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 8, fontSize: 11, fontWeight: 700,
        fontFamily: '"Chakra Petch", system-ui, sans-serif',
        color, background: bg, border: `1px solid ${border}`,
      }}
    >
      {label}
    </span>
  );
}

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const arena = ARENA_CONFIG[tournament.arena];
  return (
    <Link to={`/tournaments/${tournament.id}`}>
      <Card className="bg-arena-surface border-arena-border hover:border-white/15 hover:bg-arena-elev transition-all">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-arena-text-primary font-semibold truncate font-display">{tournament.title}</p>
              <p className="text-arena-text-tertiary text-xs mt-0.5">
                {tournament.entryCount ?? 0} / {tournament.maxPlayers ?? '∞'} players
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge
                className="text-xs font-medium text-black"
                style={{ backgroundColor: arena.color }}
              >
                {arena.label}
              </Badge>
              {tournament.hasJoined && (
                <Badge className="text-xs bg-arena-purple/20 text-arena-purple-bright border border-arena-purple/30 font-medium flex items-center gap-1">
                  <Check size={10} /> Joined
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="text-arena-gold font-semibold">
              ₦{Number(tournament.prizeFirst).toLocaleString()}
            </span>
            <span className="text-arena-text-tertiary">
              Entry: ₦{Number(tournament.entryFee).toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function HomePage() {
  const user  = useAuthStore((s) => s.user);
  const myId  = user?.id ?? '';
  const { data: stats }        = useUserStats();
  const { data: history }      = useDuelHistory();
  const {
    data: tournaments,
    isLoading: tournamentsLoading,
    error:     tournamentsError,
  } = useTournaments({ status: 'open' });

  const initials    = (user?.username ?? '??').slice(0, 2).toUpperCase();
  const currentRank = stats?.seasonRank ?? user?.rank;
  const greeting    = getGreeting();

  const hasRing    = !!(stats?.level != null && stats.intoLevel != null && stats.nextLevelAt);
  const hasRankBar = !!(stats?.seasonRank && stats.seasonPoints != null && stats.nextRankAt != null);

  // Daily nudge: derive from history timestamps whether user has completed a game today.
  // TODO(BE): firstGameToday flag would be timezone-robust; derive locally for now.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const hasPlayedToday = (history?.data ?? []).some(
    (item) => item.status === 'completed' && new Date(item.createdAt) >= todayStart,
  );
  const showDailyNudge = history !== undefined && !hasPlayedToday;

  // Recent form: last 5 completed duels
  const recentDuels  = (history?.data ?? []).filter((d) => d.status === 'completed').slice(0, 5);
  const showRecentForm = history !== undefined && recentDuels.length > 0;

  // Tournaments grouped by arena (preserves ARENA_CONFIG key order)
  const byArena = (tournaments?.data ?? []).reduce<Record<string, Tournament[]>>((acc, t) => {
    acc[t.arena] = [...(acc[t.arena] ?? []), t];
    return acc;
  }, {});

  return (
    <div className="min-h-full bg-arena-bg">
      <PageContainer size="wide" className="py-4 space-y-4">

        {/* ── 1. Hero / you-block ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-arena-border bg-arena-surface p-5">
          <div className="flex items-start gap-4">
            {hasRing ? (
              <AvatarRing
                avatarUrl={user?.avatarUrl}
                initials={initials}
                level={stats!.level!}
                intoLevel={stats!.intoLevel!}
                nextLevelAt={stats!.nextLevelAt!}
                size="md"
                animated
              />
            ) : (
              <div
                className="shrink-0 rounded-full flex items-center justify-center overflow-hidden"
                style={{ width: 88, height: 88, background: '#7C5CFF' }}
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-bold text-white text-[20px] select-none">{initials}</span>
                )}
              </div>
            )}

            <div className="flex-1 min-w-0 pt-1">
              <p className="text-arena-text-tertiary text-xs mb-0.5">{greeting}</p>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <p className="font-display font-bold text-xl text-arena-text-primary truncate leading-none">
                  {user?.username ?? '—'}
                </p>
                {currentRank && <RankBadge rank={currentRank} size="sm" />}
              </div>
              {hasRankBar && (
                <RankBar
                  rank={stats!.seasonRank!}
                  points={stats!.seasonPoints!}
                  nextAt={stats!.nextRankAt!}
                  floor={stats!.seasonRankFloor ?? 0}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── 2. Daily bonus nudge (conditional) ──────────────────────────── */}
        {showDailyNudge && (
          <Link
            to="/duels/create"
            className="animate-slide-up flex items-center gap-3 rounded-xl border border-arena-gold/30 bg-arena-gold/[0.07] px-4 py-3 transition-colors hover:bg-arena-gold/10"
          >
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(245,166,35,0.15)' }}
            >
              <Zap className="h-4 w-4 text-arena-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-arena-text-primary text-sm font-semibold">Play your first game today</p>
              <p className="text-arena-gold text-xs font-medium mt-0.5">+50 XP daily bonus</p>
            </div>
            <ChevronRight className="h-4 w-4 text-arena-text-tertiary shrink-0" />
          </Link>
        )}

        {/* ── 3. Quick Duel CTA ───────────────────────────────────────────── */}
        <div className="space-y-2">
          <Link
            to="/duels/create"
            className={cn(
              'flex w-full h-14 items-center justify-center gap-2 rounded-xl',
              'bg-arena-purple text-white font-semibold font-display text-base',
              'hover:bg-arena-purple-bright active:scale-[0.98] active:opacity-90',
              'transition-all select-none',
            )}
          >
            <Swords className="h-5 w-5" />
            Quick Duel
          </Link>
          <Link
            to="/duels"
            className="flex w-full h-10 items-center justify-center text-sm text-arena-text-secondary hover:text-arena-text-primary transition-colors"
          >
            Have a code? Join
          </Link>
        </div>

        {/* ── 4. Recent form ──────────────────────────────────────────────── */}
        {showRecentForm && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-display text-xs font-semibold text-arena-text-tertiary uppercase tracking-[0.09em]">
                Recent form
              </p>
              <Link
                to="/duels"
                className="flex items-center gap-0.5 text-xs text-arena-purple-bright hover:underline font-medium"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex items-center gap-2">
              {recentDuels.map((duel) => (
                <OutcomePill key={duel.id} outcome={getOutcome(duel, myId)} />
              ))}
            </div>
          </div>
        )}

        {/* ── 5. Tournaments ──────────────────────────────────────────────── */}
        <div className="pb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display text-xs font-semibold text-arena-text-tertiary uppercase tracking-[0.09em]">
              Tournaments
            </p>
            <p className="text-xs text-arena-text-tertiary">Real cash prizes</p>
          </div>

          {tournamentsLoading && (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          )}

          {tournamentsError && (
            <EmptyState
              title="Couldn't load tournaments"
              description="Pull to refresh or try again later"
              icon={<AlertTriangle size={24} />}
            />
          )}

          {!tournamentsLoading && !tournamentsError && Object.keys(byArena).length === 0 && (
            <EmptyState
              title="No open tournaments yet"
              description="New tournaments drop regularly — stay sharp in duels while you wait"
              icon={<LayoutGrid size={24} />}
            />
          )}

          {!tournamentsLoading &&
            (Object.keys(ARENA_CONFIG) as TournamentArena[]).map((arenaKey) => {
              const list = byArena[arenaKey];
              if (!list?.length) return null;
              return (
                <div key={arenaKey} className="mb-6">
                  <h3 className="flex items-center gap-2 font-display font-semibold text-arena-text-secondary text-xs mb-3">
                    <span className="text-arena-text-tertiary flex items-center">
                      {ARENA_LUCIDE_ICONS[arenaKey]}
                    </span>
                    {ARENA_CONFIG[arenaKey].label}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {list.map((t) => (
                      <TournamentCard key={t.id} tournament={t} />
                    ))}
                  </div>
                </div>
              );
            })}
        </div>

      </PageContainer>
    </div>
  );
}
