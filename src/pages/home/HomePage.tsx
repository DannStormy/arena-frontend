import { Link } from 'react-router-dom';
import { AlertTriangle, LayoutGrid, Check, Swords, ChevronRight, Zap } from 'lucide-react';
import { useTournaments } from '@/hooks/use-tournaments';
import { useDuelHistory } from '@/hooks/use-duels';
import { useUserStats } from '@/hooks/use-user';
import { useAuthStore } from '@/stores/auth.store';
import { ARENA_CONFIG } from '@/lib/arena-config';
import { ARENA_LUCIDE_ICONS } from '@/lib/arena-icons';
import { EMBER } from '@/lib/ember';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer } from '@/components/common/PageContainer';
import { AvatarRing } from '@/components/common/AvatarRing';
import { TierBadge } from '@/components/common/TierBadge';
import { RankBar } from '@/components/common/RankBar';
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

// ── Outcome pill — ember W, crimson L, muted D ───────────────────────────────

function OutcomePill({ outcome }: { outcome: 'win' | 'loss' | 'tie' }) {
  const cfg = {
    win:  { label: 'W', color: '#F0B05A', bg: 'rgba(240,176,90,0.14)',  shadow: 'inset 0 0 0 1px rgba(240,176,90,0.45)' },
    loss: { label: 'L', color: '#d98a6f', bg: 'rgba(138,51,36,0.18)',   shadow: 'inset 0 0 0 1px rgba(138,51,36,0.50)' },
    tie:  { label: 'D', color: '#7A6E60', bg: 'rgba(118,118,127,0.08)', shadow: 'inset 0 0 0 1px rgba(118,118,127,0.20)' },
  }[outcome];

  return (
    <span
      className="clip-chip-sm inline-flex items-center justify-center font-display font-bold select-none"
      style={{
        width:      28,
        height:     28,
        fontSize:   11,
        color:      cfg.color,
        background: cfg.bg,
        boxShadow:  cfg.shadow,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ── Tournament card ───────────────────────────────────────────────────────────

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const arena = ARENA_CONFIG[tournament.arena];
  return (
    <Link to={`/tournaments/${tournament.id}`}>
      <div
        className="clip-card"
        style={{ background: EMBER.surface }}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p
                className="font-display font-semibold truncate"
                style={{ color: EMBER.textPrimary }}
              >
                {tournament.title}
              </p>
              <p className="text-xs mt-0.5" style={{ color: EMBER.textTertiary }}>
                {tournament.entryCount ?? 0} / {tournament.maxPlayers ?? '∞'} players
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {/* arena category tag — per-arena color stays */}
              <Badge
                className="text-xs font-medium text-black"
                style={{ backgroundColor: arena.color }}
              >
                {arena.label}
              </Badge>
              {/* Joined pill — ember */}
              {tournament.hasJoined && (
                <span
                  className="clip-chip-sm inline-flex items-center gap-1 font-display font-bold"
                  style={{
                    fontSize:   10,
                    padding:    '2px 7px',
                    color:      EMBER.accent,
                    background: 'rgba(232,137,59,0.12)',
                    boxShadow:  'inset 0 0 0 1px rgba(232,137,59,0.35)',
                  }}
                >
                  <Check size={9} /> Joined
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <span
              className="font-display font-semibold text-sm"
              style={{ color: EMBER.accentBright }}
            >
              ₦{Number(tournament.prizeFirst).toLocaleString()}
            </span>
            <span className="text-xs" style={{ color: EMBER.textTertiary }}>
              Entry: ₦{Number(tournament.entryFee).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

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

  const hasRing = !!(stats?.level != null && stats.intoLevel != null && stats.nextLevelAt);
  const hasRankBar = !!(
    stats?.seasonRank &&
    stats.seasonPoints != null &&
    stats.nextRankAt != null
  );

  // TODO(BE): firstGameToday flag would be timezone-robust; derive locally for now.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const hasPlayedToday = (history?.data ?? []).some(
    (item) => item.status === 'completed' && new Date(item.createdAt) >= todayStart,
  );
  const showDailyNudge  = history !== undefined && !hasPlayedToday;
  const recentDuels     = (history?.data ?? []).filter((d) => d.status === 'completed').slice(0, 5);
  const showRecentForm  = history !== undefined && recentDuels.length > 0;

  const byArena = (tournaments?.data ?? []).reduce<Record<string, Tournament[]>>((acc, t) => {
    acc[t.arena] = [...(acc[t.arena] ?? []), t];
    return acc;
  }, {});

  return (
    <div className="min-h-full" style={{ background: EMBER.base }}>
      <PageContainer size="wide" className="py-4 space-y-4">

        {/* ── 1. Hero / you-block ─────────────────────────────────────────── */}
        <div className="clip-card p-5" style={{ background: EMBER.surface }}>
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
              // Fallback disc (no level data yet) — ice gradient to match AvatarRing disc
              <div
                className="shrink-0 clip-avatar flex items-center justify-center overflow-hidden select-none"
                style={{
                  width:      88,
                  height:     88,
                  background: 'rgba(198,220,232,0.15)',
                }}
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-bold text-[20px]" style={{ color: '#DCEAF2' }}>
                    {initials}
                  </span>
                )}
              </div>
            )}

            <div className="flex-1 min-w-0 pt-1">
              <p className="text-xs mb-0.5" style={{ color: EMBER.textTertiary }}>{greeting}</p>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <p className="font-display font-bold text-xl truncate leading-none" style={{ color: EMBER.textPrimary }}>
                  {user?.username ?? '—'}
                </p>
                {currentRank && <TierBadge tier={currentRank} size="sm" />}
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
            className="clip-row relative flex items-center gap-3 px-4 py-3 active:opacity-90 transition-opacity animate-slide-up"
            style={{ background: EMBER.surface }}
          >
            {/* ember accent bar */}
            <div
              className="absolute left-0 top-0 bottom-0 w-[3px]"
              style={{ background: EMBER.accent }}
            />
            <div
              className="flex items-center justify-center shrink-0 pl-1"
              style={{ width: 36, height: 36 }}
            >
              <div
                className="flex items-center justify-center"
                style={{ width: 32, height: 32, background: 'rgba(232,137,59,0.13)' }}
              >
                <Zap className="h-4 w-4" style={{ color: EMBER.accent }} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: EMBER.textPrimary }}>
                Play your first game today
              </p>
              <p className="text-xs font-medium mt-0.5" style={{ color: EMBER.accent }}>
                +50 XP daily bonus
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0" style={{ color: EMBER.textTertiary }} />
          </Link>
        )}

        {/* ── 3. Quick Duel CTA ───────────────────────────────────────────── */}
        <div className="space-y-2">
          <Link
            to="/duels/create"
            className="clip-card flex w-full h-14 items-center justify-center gap-2 font-display font-bold text-base select-none active:scale-[0.98] active:opacity-90 hover:brightness-[1.06] transition-all"
            style={{ background: 'linear-gradient(150deg, #E8893B, #C2541E)', color: '#fff' }}
          >
            <Swords className="h-5 w-5" />
            Quick Duel
          </Link>
          <Link
            to="/duels"
            className="flex w-full h-10 items-center justify-center text-sm transition-colors"
          >
            <span style={{ color: EMBER.textTertiary }}>Have a code?&nbsp;</span>
            <span className="font-medium" style={{ color: EMBER.accent }}>Join</span>
          </Link>
        </div>

        {/* ── 4. Recent form ──────────────────────────────────────────────── */}
        {showRecentForm && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.09em]" style={{ color: EMBER.textTertiary }}>
                Recent form
              </p>
              <Link
                to="/duels"
                className="flex items-center gap-0.5 text-xs font-medium hover:underline"
                style={{ color: EMBER.accent }}
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
            <p className="font-display text-xs font-semibold uppercase tracking-[0.09em]" style={{ color: EMBER.textTertiary }}>
              Tournaments
            </p>
            <p className="text-xs" style={{ color: EMBER.textTertiary }}>Real cash prizes</p>
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
                  <h3
                    className="flex items-center gap-2 font-display font-semibold text-xs mb-3"
                    style={{ color: EMBER.textSecondary }}
                  >
                    <span className="flex items-center" style={{ color: EMBER.textTertiary }}>
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
