import { Link } from 'react-router-dom';
import { AlertTriangle, LayoutGrid, Check, Swords, ChevronRight, Zap, Trophy } from 'lucide-react';
import { useTournaments } from '@/hooks/use-tournaments';
import { useDuelHistory } from '@/hooks/use-duels';
import { useUserStats } from '@/hooks/use-user';
import { useStreak } from '@/hooks/use-streak';
import { useAuthStore } from '@/stores/auth.store';
import { ARENA_CONFIG } from '@/lib/arena-config';
import { ARENA_LUCIDE_ICONS } from '@/lib/arena-icons';
import { EMBER } from '@/lib/ember';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer } from '@/components/common/PageContainer';
import { AvatarRing } from '@/components/common/AvatarRing';
import { TierBadge, getTierDisplayName, normalizeTierName } from '@/components/common/TierBadge';
import { RankBar } from '@/components/common/RankBar';
import { StreakBanner } from '@/components/common/StreakBanner';
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
  const { data: streak }       = useStreak();
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
  // Don't nag "play your first game today" once any play (incl. Speed Math) has
  // already kept the streak alive — the two signals must not contradict.
  const showDailyNudge  = history !== undefined && !hasPlayedToday && !streak?.playedToday;
  const recentDuels     = (history?.data ?? []).filter((d) => d.status === 'completed').slice(0, 5);
  const showRecentForm  = history !== undefined && recentDuels.length > 0;

  const byArena = (tournaments?.data ?? []).reduce<Record<string, Tournament[]>>((acc, t) => {
    acc[t.arena] = [...(acc[t.arena] ?? []), t];
    return acc;
  }, {});

  // ── Live signal — real, derivable data only (no fabricated "players online").
  // Open tournaments are genuinely live right now; their prize pool is real.
  const openTournaments = tournaments?.data ?? [];
  const openCount = openTournaments.length;
  const livePool = openTournaments.reduce((sum, t) => sum + Number(t.prizeFirst || 0), 0);
  const liveLabel =
    openCount > 0
      ? `${openCount} tournament${openCount === 1 ? '' : 's'} live`
      : 'Season live';

  return (
    <div className="min-h-full" style={{ background: EMBER.base }}>
      <PageContainer size="wide" className="py-4 space-y-5">

        {/* ── Top bar — compact identity, deliberately demoted ────────────── */}
        <Link to="/profile" className="flex items-center gap-3 active:opacity-90">
          {hasRing ? (
            <AvatarRing
              avatarUrl={user?.avatarUrl}
              initials={initials}
              level={stats!.level!}
              intoLevel={stats!.intoLevel!}
              nextLevelAt={stats!.nextLevelAt!}
              size="sm"
              animated
            />
          ) : (
            <div
              className="shrink-0 clip-avatar flex items-center justify-center overflow-hidden select-none"
              style={{ width: 44, height: 44, background: 'rgba(198,220,232,0.15)' }}
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-bold text-[13px]" style={{ color: '#DCEAF2' }}>
                  {initials}
                </span>
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs" style={{ color: EMBER.textTertiary }}>{greeting}</p>
            <p className="font-display font-bold text-lg truncate leading-tight" style={{ color: EMBER.textPrimary }}>
              {user?.username ?? '—'}
            </p>
          </div>
          {currentRank && <TierBadge tier={currentRank} size="sm" />}
        </Link>

        {/* ── HERO PLAY — one unmissable, alive primary action ────────────── */}
        <div className="relative">
          <div className="hero-room-light" />
          <div className="hero-room-drift" />
          <Link
            to="/duels/create"
            className="animate-lobby-breathe clip-card relative block overflow-hidden select-none active:scale-[0.98] transition-transform"
            style={{ background: 'linear-gradient(150deg, #E8893B, #C2541E)', minHeight: 150 }}
          >
            {/* Live chip — pulsing dot + real derivable signal */}
            <div className="absolute top-3 right-3">
              <span
                className="clip-chip-sm inline-flex items-center gap-1.5 font-display font-bold uppercase tracking-wide"
                style={{
                  fontSize: 10,
                  padding: '3px 8px',
                  color: '#fff',
                  background: 'rgba(0,0,0,0.26)',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.28)',
                }}
              >
                <span className="relative inline-flex" style={{ width: 6, height: 6 }}>
                  <span
                    className="animate-live-dot absolute inset-0"
                    style={{ background: '#fff', borderRadius: 99 }}
                  />
                </span>
                {liveLabel}
              </span>
            </div>

            <div className="px-5 pt-6 pb-5">
              <div className="flex items-center gap-1.5 text-white/80">
                <Swords className="h-4 w-4" />
                <span className="font-display font-bold text-xs uppercase tracking-[0.14em]">Quick Duel</span>
              </div>
              <p className="font-display font-bold text-white leading-[1.05] mt-2" style={{ fontSize: 30 }}>
                Jump in.<br />Beat someone now.
              </p>
              <p className="text-white/85 text-sm mt-1.5">Head-to-head. Bank the points. ⚡</p>
              <span
                className="clip-chip-sm mt-4 inline-flex items-center gap-1.5 font-display font-bold text-sm"
                style={{ padding: '8px 16px', color: '#C2541E', background: '#fff' }}
              >
                Play <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </div>
        <Link
          to="/duels"
          className="-mt-2 flex w-full h-9 items-center justify-center text-sm"
        >
          <span style={{ color: EMBER.textTertiary }}>Have a code?&nbsp;</span>
          <span className="font-medium" style={{ color: EMBER.accent }}>Join</span>
        </Link>

        {/* ── Status trophies — rank + streak, elevated & animated ────────── */}
        <div className="clip-card p-4" style={{ background: EMBER.surface }}>
          <div className="flex items-center gap-3.5">
            <TierBadge tier={currentRank ?? 'spectator'} size="lg" />
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-1"
                style={{ color: EMBER.textTertiary }}
              >
                Season rank
              </p>
              <p
                className="font-display font-bold text-lg leading-none mb-2.5"
                style={{ color: EMBER.textPrimary }}
              >
                {getTierDisplayName(currentRank ?? 'spectator')}
              </p>
              {hasRankBar ? (
                <RankBar
                  rank={stats!.seasonRank!}
                  points={stats!.seasonPoints!}
                  nextAt={stats!.nextRankAt!}
                  floor={stats!.seasonRankFloor ?? 0}
                />
              ) : (
                <p className="text-xs" style={{ color: EMBER.textTertiary }}>
                  Play ranked duels to climb the ladder
                </p>
              )}
            </div>
          </div>
        </div>

        {streak && <StreakBanner streak={streak} />}

        {/* Daily bonus nudge (conditional) */}
        {showDailyNudge && (
          <Link
            to="/duels/create"
            className="clip-row relative flex items-center gap-3 px-4 py-3 active:opacity-90 transition-opacity animate-slide-up"
            style={{ background: EMBER.surface }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: EMBER.accent }} />
            <div className="flex items-center justify-center shrink-0 pl-1" style={{ width: 36, height: 36 }}>
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

        {/* ── Secondary shelf — demoted "more ways to play" ───────────────── */}
        <div className="space-y-2">
          <p
            className="font-display text-xs font-semibold uppercase tracking-[0.09em] pt-1"
            style={{ color: EMBER.textTertiary }}
          >
            More ways to play
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/async/new?intent=friend"
              className="clip-row relative flex flex-col justify-center gap-1 px-3.5 py-2.5 active:opacity-90 transition-opacity"
              style={{ background: EMBER.surface }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: EMBER.accent }} />
              <div
                className="flex items-center justify-center"
                style={{ width: 28, height: 28, background: 'rgba(232,137,59,0.13)' }}
              >
                <Swords className="h-3.5 w-3.5" style={{ color: EMBER.accent }} />
              </div>
              <p className="mt-1 text-sm font-semibold" style={{ color: EMBER.textPrimary }}>
                Challenge a friend
              </p>
              <p className="text-xs" style={{ color: EMBER.textTertiary }}>
                Share a link · async
              </p>
            </Link>
            <Link
              to="/async/new?intent=quick"
              className="clip-row relative flex flex-col justify-center gap-1 px-3.5 py-2.5 active:opacity-90 transition-opacity"
              style={{ background: EMBER.surface }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: EMBER.accentBright }} />
              <div
                className="flex items-center justify-center"
                style={{ width: 28, height: 28, background: 'rgba(240,176,90,0.13)' }}
              >
                <Zap className="h-3.5 w-3.5" style={{ color: EMBER.accentBright }} />
              </div>
              <p className="mt-1 text-sm font-semibold" style={{ color: EMBER.textPrimary }}>
                Quick match
              </p>
              <p className="text-xs" style={{ color: EMBER.textTertiary }}>
                Beat a ghost run
              </p>
            </Link>
          </div>

          <Link
            to="/play/speed-math"
            className="clip-row relative flex items-center gap-3 px-3.5 py-2.5 active:opacity-90 transition-opacity"
            style={{ background: EMBER.surface }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: EMBER.accentBright }} />
            <div className="flex items-center justify-center shrink-0" style={{ width: 28, height: 28, background: 'rgba(240,176,90,0.13)' }}>
              <Zap className="h-3.5 w-3.5" style={{ color: EMBER.accentBright }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: EMBER.textPrimary }}>
                Speed Math practice
              </p>
              <p className="text-xs mt-0.5" style={{ color: EMBER.textTertiary }}>
                Just you vs the clock. Bank the points. ⚡
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0" style={{ color: EMBER.textTertiary }} />
          </Link>

          <Link
            to="/leaderboard"
            className="clip-row relative flex items-center gap-3 px-3.5 py-2.5 active:opacity-90 transition-opacity"
            style={{ background: EMBER.surface }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: EMBER.accent }} />
            <div className="flex items-center justify-center shrink-0" style={{ width: 28, height: 28, background: 'rgba(232,137,59,0.13)' }}>
              <Trophy className="h-3.5 w-3.5" style={{ color: EMBER.accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: EMBER.textPrimary }}>
                Leaderboard
              </p>
              <p className="text-xs mt-0.5" style={{ color: EMBER.textTertiary }}>
                {currentRank
                  ? `You're ${getTierDisplayName(normalizeTierName(currentRank))}${
                      stats?.seasonPoints != null
                        ? ` · ${stats.seasonPoints.toLocaleString()} pts`
                        : ''
                    }`
                  : 'See where you rank this season'}
              </p>
            </div>
            {currentRank ? (
              <TierBadge tier={currentRank} size="sm" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" style={{ color: EMBER.textTertiary }} />
            )}
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
            <p className="text-xs" style={{ color: EMBER.textTertiary }}>
              {livePool > 0
                ? `₦${livePool.toLocaleString()} in prize pools`
                : 'Sponsored prize pools'}
            </p>
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
