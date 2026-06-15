import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Zap, Trophy, Users } from 'lucide-react';
import { useTournament, useTournamentLeaderboard } from '@/hooks/use-tournaments';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import { getErrorMessage, cn } from '@/lib/utils';
import { ARENA_CONFIG } from '@/lib/arena-config';
import { ArenaIcon } from '@/lib/arena-icons';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import type { GameType } from '@/types/tournament.types';

const GAME_TYPE_CONFIG: Record<GameType, { label: string; accent: string; icon: React.ReactNode }> = {
  lightning_trivia:  { label: 'Lightning Trivia',  accent: '#4F9CF0', icon: <Zap    size={11} /> },
  last_man_standing: { label: 'Last Man Standing', accent: '#FF7043', icon: <Trophy size={11} /> },
};

// Placement medal — gold/silver/bronze inline indicator.
// NOT RankBadge (that's for season tiers only and will warn on medal strings).
const MEDAL_COLOR = ['#F5A623', 'rgba(255,255,255,0.6)', '#C9774A'] as const;
function Medal({ pos }: { pos: 1 | 2 | 3 }) {
  return (
    <span
      className="font-display font-black text-[11px] tabular-nums w-7 shrink-0 text-center"
      style={{ color: MEDAL_COLOR[pos - 1] }}
    >
      {pos === 1 ? '1st' : pos === 2 ? '2nd' : '3rd'}
    </span>
  );
}

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: tournament, isLoading, error } = useTournament(id!);
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (tournament?.hasJoined) setHasJoined(true);
  }, [tournament?.hasJoined]);

  // Leaderboard — display only. Enabled when the user has completed their play.
  // Used to derive honest async standing; has no effect on join/play flow.
  const hasCompleted   = tournament?.userEntry?.status === 'completed';
  const { data: leaderboard } = useTournamentLeaderboard(hasCompleted ? id! : '');
  const myEntry        = leaderboard?.find((e) => e.userId === user?.id);
  const myRank         = myEntry?.rank ?? null;
  const totalFinished  = leaderboard?.length ?? 0;
  const showRank       = myRank !== null && totalFinished > 1;
  const isOnlyFinisher = myRank === 1 && totalFinished === 1;
  const myPrize        = showRank && myRank <= 3 && myEntry?.prizeWon ? myEntry.prizeWon : null;

  // ── Logic (unchanged) ─────────────────────────────────────────────────────

  const handleJoin = async () => {
    if (!id) return;
    setIsJoining(true);
    try {
      await api.post(`/tournaments/${id}/join`);
      setHasJoined(true);
      toast.success('Joined tournament!');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to join tournament'));
    } finally {
      setIsJoining(false);
    }
  };

  const handlePlay = async () => {
    if (!id) return;
    setIsStarting(true);
    try {
      const response = await api.post('/game-sessions', { tournamentId: id });
      navigate(`/game/${response.data.id}`, {
        state: { totalQuestions: response.data.totalQuestions, tournamentId: id },
      });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to start game'));
    } finally {
      setIsStarting(false);
    }
  };

  // ── Guards ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-arena-bg">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="flex min-h-svh flex-col bg-arena-bg">
        <PageHeader title="Tournament" showBack />
        <div className="flex flex-1 items-center justify-center px-4">
          <ErrorMessage message="Could not load tournament details." />
        </div>
      </div>
    );
  }

  // ── Display derivations ───────────────────────────────────────────────────

  const arena         = ARENA_CONFIG[tournament.arena];
  const gameTypeCfg   = GAME_TYPE_CONFIG[tournament.gameType];
  const playerCount   = tournament.entryCount ?? 0;
  const progressPct   = tournament.maxPlayers
    ? Math.min((playerCount / tournament.maxPlayers) * 100, 100)
    : 0;
  const effectivelyJoined = tournament.hasJoined || hasJoined;
  const canJoin           = tournament.status === 'open' && !effectivelyJoined;
  const userEntry         = tournament.userEntry;
  const accuracy =
    userEntry && userEntry.totalAnswered > 0
      ? Math.round((userEntry.score / userEntry.totalAnswered) * 100)
      : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full bg-arena-bg">
      <PageHeader title={tournament.title} showBack />

      <PageContainer size="default" className="py-5 pb-10 space-y-4">

        {/* ── 1. Identity — arena + game type ─────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold text-black"
            style={{ background: arena.color }}
          >
            <ArenaIcon arena={tournament.arena} size={12} />
            {arena.label}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold"
            style={{
              background: `${gameTypeCfg.accent}1A`,
              color:      gameTypeCfg.accent,
              border:     `1px solid ${gameTypeCfg.accent}33`,
            }}
          >
            {gameTypeCfg.icon}
            {gameTypeCfg.label}
          </span>
        </div>

        {/* ── 2. Prize ladder ──────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-arena-surface border border-arena-border p-4 space-y-3">
          <p className="text-[10px] font-semibold text-arena-text-tertiary uppercase tracking-[0.09em]">
            Prizes
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Medal pos={1} />
              <span className="flex-1 text-sm text-arena-text-secondary">1st place</span>
              <span
                className="font-display font-bold text-base tabular-nums"
                style={{ color: '#F5A623' }}
              >
                ₦{Number(tournament.prizeFirst).toLocaleString()}
              </span>
            </div>

            {tournament.prizeSecond && (
              <div className="flex items-center gap-3">
                <Medal pos={2} />
                <span className="flex-1 text-sm text-arena-text-secondary">2nd place</span>
                <span className="font-display font-semibold text-sm text-arena-text-primary tabular-nums">
                  ₦{Number(tournament.prizeSecond).toLocaleString()}
                </span>
              </div>
            )}

            {tournament.prizeThird && (
              <div className="flex items-center gap-3">
                <Medal pos={3} />
                <span className="flex-1 text-sm text-arena-text-secondary">3rd place</span>
                <span className="font-display font-semibold text-sm text-arena-text-primary tabular-nums">
                  ₦{Number(tournament.prizeThird).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Players / fill state ───────────────────────────────────────── */}
        <div className="rounded-2xl bg-arena-surface border border-arena-border p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-arena-text-tertiary uppercase tracking-[0.09em]">
              Players
            </p>
            <span className="flex items-center gap-1 text-[11px] text-arena-text-secondary tabular-nums">
              <Users size={11} className="shrink-0" />
              {playerCount}
              {tournament.maxPlayers
                ? ` / ${tournament.maxPlayers}`
                : tournament.minPlayers > 1
                  ? ` · min ${tournament.minPlayers}`
                  : ''}
            </span>
          </div>

          {tournament.maxPlayers && (
            <Progress value={progressPct} className="h-1.5" />
          )}

          {!tournament.maxPlayers && playerCount < tournament.minPlayers && (
            <p className="text-xs text-arena-text-tertiary">
              {tournament.minPlayers - playerCount} more player
              {tournament.minPlayers - playerCount !== 1 ? 's' : ''} needed to start
            </p>
          )}
        </div>

        {/* ── 4. Your result (only when user has completed their play) ─────── */}
        {hasCompleted && userEntry && (
          <div className="rounded-2xl bg-arena-surface border border-arena-border p-4 space-y-3">
            <p className="text-[10px] font-semibold text-arena-text-tertiary uppercase tracking-[0.09em]">
              Your result
            </p>

            <div className="flex items-end gap-5">
              <div>
                <p
                  className="font-display font-black text-3xl tabular-nums leading-none"
                  style={{ color: gameTypeCfg.accent }}
                >
                  {userEntry.score}
                </p>
                <p className="text-[10px] text-arena-text-tertiary mt-0.5">pts</p>
              </div>
              {accuracy !== null && (
                <div>
                  <p className="font-display font-bold text-xl text-arena-text-primary tabular-nums leading-none">
                    {accuracy}%
                  </p>
                  <p className="text-[10px] text-arena-text-tertiary mt-0.5">accuracy</p>
                </div>
              )}
            </div>

            {/* Honest async standing — explicitly framed as partial ("so far"), not final */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
              {showRank ? (
                <div className="flex items-center justify-between">
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: gameTypeCfg.accent }}
                  >
                    #{myRank} of {totalFinished} so far
                  </span>
                  {myPrize ? (
                    <span className="text-[12px] font-semibold text-arena-green">
                      In the money · ₦{Number(myPrize).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-[12px] text-arena-text-tertiary">Top 3 win cash</span>
                  )}
                </div>
              ) : isOnlyFinisher ? (
                // Thin-field: don't present "1st of 1" as a meaningful standing
                <p className="text-[12px] text-arena-text-tertiary">
                  You've set the pace — standings update as others finish
                </p>
              ) : null}
            </div>
          </div>
        )}

        {/* ── 5. Entry fee ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl bg-arena-surface border border-arena-border px-4 py-3">
          <span className="text-sm text-arena-text-tertiary">Entry fee</span>
          <span className="font-display font-semibold text-sm text-arena-text-primary tabular-nums">
            ₦{Number(tournament.entryFee).toLocaleString()}
          </span>
        </div>

        {/* ── 6. Primary CTA (purple — reserved brand-action color) ────────── */}
        <div className="pt-1">
          {effectivelyJoined ? (
            <button
              onClick={handlePlay}
              disabled={isStarting}
              className={cn(
                'w-full h-14 rounded-xl font-display font-semibold text-base text-white',
                'bg-arena-purple hover:bg-arena-purple-bright',
                'active:scale-[0.98] active:opacity-90 transition-all select-none',
                'disabled:opacity-50 disabled:pointer-events-none',
              )}
            >
              {isStarting ? 'Starting…' : 'Play now'}
            </button>
          ) : (
            <button
              onClick={handleJoin}
              disabled={!canJoin || isJoining}
              className={cn(
                'w-full h-14 rounded-xl font-display font-semibold text-base text-white',
                'bg-arena-purple hover:bg-arena-purple-bright',
                'active:scale-[0.98] active:opacity-90 transition-all select-none',
                'disabled:opacity-50 disabled:pointer-events-none',
              )}
            >
              {isJoining
                ? 'Joining…'
                : tournament.status !== 'open'
                  ? 'Tournament closed'
                  : `Join — ₦${Number(tournament.entryFee).toLocaleString()}`}
            </button>
          )}
        </div>

      </PageContainer>
    </div>
  );
}
