import { Link, useNavigate } from 'react-router-dom';
import { Brain, Ghost, Lightbulb, Swords, ChevronRight, Zap, Trophy, CalendarDays } from 'lucide-react';
import { useDuelHistory } from '@/hooks/use-duels';
import { useUserStats } from '@/hooks/use-user';
import { useStreak } from '@/hooks/use-streak';
import { useDaily } from '@/hooks/use-daily';
import { useStartSoloSession } from '@/hooks/use-game-session';
import { useAuthStore } from '@/stores/auth.store';
import { EMBER } from '@/lib/ember';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { PageContainer } from '@/components/common/PageContainer';
import { AvatarRing } from '@/components/common/AvatarRing';
import { TierBadge, getTierDisplayName, normalizeTierName } from '@/components/common/TierBadge';
import { RankBar } from '@/components/common/RankBar';
import { StreakBanner } from '@/components/common/StreakBanner';
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

// ── Playable-mode tile ────────────────────────────────────────────────────────
// A compact, tappable card for a mode that genuinely plays right now.

function ModeTile({
  to,
  onClick,
  loading,
  icon,
  title,
  sub,
  accent,
}: {
  to?: string;
  onClick?: () => void;
  loading?: boolean;
  icon: React.ReactNode;
  title: string;
  sub: string;
  accent: string;
}) {
  const inner = (
    <>
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accent }} />
      <div
        className="flex items-center justify-center"
        style={{ width: 30, height: 30, background: `${accent}22` }}
      >
        {loading ? <LoadingSpinner size="sm" /> : <span style={{ color: accent }}>{icon}</span>}
      </div>
      <p className="mt-2 text-sm font-semibold" style={{ color: EMBER.textPrimary }}>
        {title}
      </p>
      <p className="text-xs" style={{ color: EMBER.textTertiary }}>
        {sub}
      </p>
    </>
  );

  const className =
    'press-key clip-row relative flex flex-col justify-center gap-0.5 px-3.5 py-3 text-left';
  const style = { background: EMBER.surface };

  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={loading} className={className} style={style}>
        {inner}
      </button>
    );
  }
  return (
    <Link to={to!} className={className} style={style}>
      {inner}
    </Link>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function HomePage() {
  const navigate = useNavigate();
  const user  = useAuthStore((s) => s.user);
  const myId  = user?.id ?? '';
  const { data: stats }        = useUserStats();
  const { data: history }      = useDuelHistory();
  const { data: streak }       = useStreak();
  const { data: daily }        = useDaily();
  const solo = useStartSoloSession();

  const dailyResult = daily?.alreadyPlayed ? daily.result : null;

  const initials    = (user?.username ?? '??').slice(0, 2).toUpperCase();
  const currentRank = stats?.seasonRank ?? user?.rank;
  const greeting    = getGreeting();

  const hasRing = !!(stats?.level != null && stats.intoLevel != null && stats.nextLevelAt);
  const hasRankBar = !!(
    stats?.seasonRank &&
    stats.seasonPoints != null &&
    stats.nextRankAt != null
  );

  const recentDuels     = (history?.data ?? []).filter((d) => d.status === 'completed').slice(0, 5);
  const showRecentForm  = history !== undefined && recentDuels.length > 0;

  // Start a solo trivia game, then hand off to the shared GamePage.
  const startTrivia = () => {
    if (solo.isPending) return;
    solo.mutate(
      {},
      {
        onSuccess: (s) =>
          navigate(`/game/${s.id}`, { state: { totalQuestions: s.totalQuestions } }),
      },
    );
  };

  return (
    <div className="min-h-full" style={{ background: EMBER.base }}>
      <PageContainer size="wide" className="py-4 space-y-5">

        {/* ── Top bar — compact identity ──────────────────────────────────── */}
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

        {/* ── HERO PLAY — Arena Daily, the retention centrepiece ───────────── */}
        <div className="relative">
          <div className="hero-room-light" />
          <div className="hero-room-drift" />
          <Link
            to="/daily"
            className="press-cta animate-lobby-breathe clip-card relative block overflow-hidden select-none"
            style={{ background: 'linear-gradient(150deg, #E8893B, #C2541E)', minHeight: 150 }}
          >
            {/* Honest tag — no fabricated player counts */}
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
                One shot · today
              </span>
            </div>

            <div className="px-5 pt-6 pb-5">
              <div className="flex items-center gap-1.5 text-white/80">
                <CalendarDays className="h-4 w-4" />
                <span className="font-display font-bold text-xs uppercase tracking-[0.14em]">Arena Daily</span>
              </div>

              {dailyResult ? (
                <>
                  <p className="font-display font-bold text-white leading-[1.05] mt-2" style={{ fontSize: 30 }}>
                    Daily done
                  </p>
                  <p className="text-white/85 text-sm mt-1.5">
                    #{dailyResult.rank} of {dailyResult.totalPlayers.toLocaleString()} · {dailyResult.streak}-day streak
                  </p>
                  <span
                    className="clip-chip-sm mt-4 inline-flex items-center gap-1.5 font-display font-semibold text-xs"
                    style={{ padding: '7px 14px', color: '#fff', background: 'rgba(0,0,0,0.22)' }}
                  >
                    New challenge tomorrow
                  </span>
                </>
              ) : (
                <>
                  <p className="font-display font-bold text-white leading-[1.05] mt-2" style={{ fontSize: 30 }}>
                    Arena Daily
                  </p>
                  <p className="text-white/85 text-sm mt-1.5">One shot. Same set for everyone.</p>
                  <span
                    className="clip-chip-sm mt-4 inline-flex items-center gap-1.5 font-display font-bold text-sm"
                    style={{ padding: '8px 16px', color: '#C2541E', background: '#fff' }}
                  >
                    Play <ChevronRight className="h-4 w-4" />
                  </span>
                </>
              )}
            </div>
          </Link>
        </div>

        {/* ── Playable modes — everything here plays right now ────────────── */}
        <div className="space-y-2">
          <p
            className="font-display text-xs font-semibold uppercase tracking-[0.09em] pt-1"
            style={{ color: EMBER.textTertiary }}
          >
            More ways to play
          </p>

          <div className="grid grid-cols-2 gap-2">
            <ModeTile
              to="/play/speed-math"
              icon={<Zap className="h-4 w-4" />}
              title="Speed Math"
              sub="Beat the clock"
              accent={EMBER.mode.blitz}
            />
            <ModeTile
              to="/play/memory"
              icon={<Brain className="h-4 w-4" />}
              title="Memory"
              sub="Repeat the lights"
              accent={EMBER.mode.streak}
            />
            <ModeTile
              onClick={startTrivia}
              loading={solo.isPending}
              icon={<Lightbulb className="h-4 w-4" />}
              title="Trivia"
              sub="Solo · beat the clock"
              accent={EMBER.accent}
            />
            <ModeTile
              to="/async/new?intent=quick"
              icon={<Ghost className="h-4 w-4" />}
              title="Quick match"
              sub="Beat a ghost run"
              accent={EMBER.accentBright}
            />
            <ModeTile
              to="/async/new?intent=friend"
              icon={<Swords className="h-4 w-4" />}
              title="Challenge a friend"
              sub="Share a link · async"
              accent={EMBER.accent}
            />
          </div>
        </div>

        {/* ── Status trophies — rank + streak ─────────────────────────────── */}
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

        {/* ── Leaderboard ─────────────────────────────────────────────────── */}
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

        {/* ── Recent form ─────────────────────────────────────────────────── */}
        {showRecentForm && (
          <div className="pb-4">
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

      </PageContainer>
    </div>
  );
}
