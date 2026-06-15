import { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Flag, Share2, AlertTriangle, Trophy, Zap, ChevronDown, ChevronUp, LayoutList } from 'lucide-react';
import { useGameStore } from '@/stores/game.store';
import { useAuthStore } from '@/stores/auth.store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReportQuestionPicker } from '@/components/common/ReportQuestionPicker';
import { ProgressionReveal } from '@/components/common/ProgressionReveal';
import { useSessionQuestions } from '@/hooks/use-game-session';
import { useTournament, useTournamentLeaderboard } from '@/hooks/use-tournaments';
import { Particles } from '@/components/common/Particles';
import { cn } from '@/lib/utils';
import type { GameQuestion } from '@/types/game.types';
import type { GameType } from '@/types/tournament.types';
import type { ProgressionData } from '@/types/duel.types';

const GAME_TYPE_ACCENT: Record<GameType, string> = {
  lightning_trivia:  '#4F9CF0',
  last_man_standing: '#FF7043',
};

function ordinal(n: number): string {
  if (n >= 11 && n <= 13) return `${n}th`;
  const last = n % 10;
  if (last === 1) return `${n}st`;
  if (last === 2) return `${n}nd`;
  if (last === 3) return `${n}rd`;
  return `${n}th`;
}

function rankColor(rank: number): string {
  if (rank === 1) return '#F5A623';
  if (rank === 2) return 'rgba(255,255,255,0.7)';
  if (rank === 3) return '#C9774A';
  return '#76767F';
}

export function GameResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { resetGame } = useGameStore();
  const user = useAuthStore((s) => s.user);

  const {
    finalScore, totalAnswered, totalQuestions, correctCount, isFlagged,
    myProgression, tournamentId,
  }: {
    finalScore?: number; totalAnswered?: number; totalQuestions?: number;
    correctCount?: number; isFlagged?: boolean; myProgression?: ProgressionData;
    tournamentId?: string;
  } = location.state ?? {};

  // Array-guard: preserved from punch-list fix — never let shape mismatch crash the result screen.
  const { data: rawSessionQuestions } = useSessionQuestions(sessionId);
  const questions: GameQuestion[] = Array.isArray(rawSessionQuestions)
    ? rawSessionQuestions
    : ((rawSessionQuestions as unknown as { questions?: GameQuestion[] })?.questions ?? []);

  // Tournament display data — read-only; does not touch game loop or submission.
  const { data: tournament } = useTournament(tournamentId ?? '');
  const { data: leaderboard } = useTournamentLeaderboard(tournamentId ?? '');
  const myEntry       = leaderboard?.find((e) => e.userId === user?.id);
  const myRank        = myEntry?.rank ?? null;
  const totalFinished = leaderboard?.length ?? 0;
  const rankIsFinal   = tournament?.status === 'completed';
  const thinField     = myRank === 1 && totalFinished === 1;
  const myPrize       = myRank && myRank <= 3 && myEntry?.prizeWon ? myEntry.prizeWon : null;

  // Game-type theming — defaults to azure while tournament loads.
  const gameType = (tournament?.gameType ?? 'lightning_trivia') as GameType;
  const accent   = GAME_TYPE_ACCENT[gameType] ?? '#4F9CF0';

  const [showBreakdown, setShowBreakdown]     = useState(false);
  const [reportingQuestion, setReportingQuestion] = useState<GameQuestion | null>(null);

  const accuracy = (totalAnswered ?? 0) > 0
    ? Math.round(((correctCount ?? 0) / (totalAnswered ?? 1)) * 100)
    : 0;

  const handleShare = async () => {
    const text = `I scored ${finalScore ?? 0} points in Arena! Can you beat me?`;
    if (navigator.share) {
      await navigator.share({ text, url: window.location.origin });
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  const handleBack = () => {
    resetGame();
    navigate('/', { replace: true });
  };

  // ── Placement copy ────────────────────────────────────────────────────────
  // "so far" framing makes the async nature explicit when the tournament is still live.
  let placementLine: string | null = null;
  let placementSub:  string | null = null;

  if (myRank !== null) {
    if (thinField) {
      placementLine = 'You set the pace';
      placementSub  = 'First to finish — standings update as others play';
    } else if (rankIsFinal) {
      placementLine = `Final placement: ${ordinal(myRank)}`;
    } else {
      placementLine = `Current standing: ${ordinal(myRank)}`;
      placementSub  = `of ${totalFinished} finished so far`;
    }
  }

  return (
    <div className="relative min-h-svh bg-arena-bg">
      <Particles />

      <div className="relative z-10 mx-auto w-full max-w-[420px] px-4 pt-10 pb-12 flex flex-col gap-5">

        {/* ── Placement header — the payoff beat ──────────────────────────── */}
        <div
          className="flex flex-col items-center gap-3 -mx-4 px-4 pt-8 pb-7 rounded-b-3xl"
          style={{ background: `linear-gradient(to bottom, ${accent}1A, transparent)` }}
        >
          {/* Game-type icon */}
          <span className="animate-result-reveal" style={{ color: accent }}>
            {gameType === 'last_man_standing'
              ? <Trophy className="h-12 w-12" />
              : <Zap    className="h-12 w-12" />}
          </span>

          {/* Rank numeral + placement line */}
          {myRank !== null && (
            <div className="text-center animate-result-reveal">
              {!thinField && (
                <p
                  className="font-display font-black text-6xl tabular-nums leading-none mb-1"
                  style={{ color: rankColor(myRank) }}
                >
                  {ordinal(myRank)}
                </p>
              )}
              <p className="font-display font-bold text-base text-arena-text-primary">
                {placementLine}
              </p>
              {placementSub && (
                <p className="text-arena-text-tertiary text-sm mt-0.5">{placementSub}</p>
              )}
            </div>
          )}

          {/* Prize moment */}
          {myPrize && !thinField ? (
            <div
              className="animate-result-reveal rounded-full px-6 py-2"
              style={{
                background: 'rgba(45,212,167,0.12)',
                border:     '1px solid rgba(45,212,167,0.3)',
              }}
            >
              <p className="font-display font-black text-xl text-arena-win tabular-nums">
                {rankIsFinal ? 'You won ' : 'In the money · '}
                ₦{Number(myPrize).toLocaleString()}
              </p>
            </div>
          ) : myRank !== null && !thinField ? (
            <p className="text-arena-text-tertiary text-sm animate-result-reveal">
              Top 3 win cash
            </p>
          ) : null}
        </div>

        {/* ── Score card ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-arena-surface border border-arena-border p-5 animate-slide-up">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p
                className="font-display font-black text-5xl tabular-nums leading-none"
                style={{ color: accent }}
              >
                {finalScore ?? 0}
              </p>
              <p className="text-arena-text-tertiary text-xs mt-1">points</p>
            </div>
            <div className="text-right">
              <p className="font-display font-bold text-2xl text-arena-text-primary tabular-nums leading-none">
                {accuracy}%
              </p>
              <p className="text-arena-text-tertiary text-xs mt-1">accuracy</p>
            </div>
          </div>

          <div
            className="flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}
          >
            <span className="text-sm text-arena-text-secondary">Correct</span>
            <span className="font-display font-semibold text-sm text-arena-text-primary tabular-nums">
              {correctCount ?? 0} / {totalQuestions ?? totalAnswered ?? 0}
            </span>
          </div>

          {isFlagged && (
            <div className="rounded-xl bg-arena-red/10 border border-arena-red/30 p-3 mt-3">
              <p className="text-arena-red text-xs font-medium flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Your session was flagged for review. Results may be adjusted.
              </p>
            </div>
          )}
        </div>

        {/* ── XP / rank progression ───────────────────────────────────────── */}
        {myProgression && <ProgressionReveal data={myProgression} />}

        {/* ── Per-question breakdown ───────────────────────────────────────── */}
        {questions.length > 0 && (
          <div className="rounded-2xl border border-arena-border bg-arena-surface overflow-hidden">
            <button
              onClick={() => setShowBreakdown((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-arena-text-secondary hover:text-arena-text-primary transition-colors"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <LayoutList className="h-4 w-4" />
                Questions ({questions.length})
              </span>
              {showBreakdown
                ? <ChevronUp   className="h-4 w-4" />
                : <ChevronDown className="h-4 w-4" />}
            </button>

            {showBreakdown && (
              <div className="border-t border-arena-border divide-y divide-arena-border/40">
                {questions.map((q, i) => (
                  <div key={q.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="text-arena-text-tertiary text-xs font-mono shrink-0 w-6 mt-0.5">
                      Q{i + 1}
                    </span>
                    <p className="text-sm text-arena-text-secondary leading-snug flex-1">
                      {q.content}
                    </p>
                    <button
                      onClick={() => setReportingQuestion(q)}
                      className="shrink-0 text-white/20 hover:text-arena-purple-bright transition-colors mt-0.5"
                      title="Report this question"
                    >
                      <Flag className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CTAs ────────────────────────────────────────────────────────── */}
        <div className="space-y-2.5">
          {tournamentId && (
            <button
              onClick={() => navigate(`/tournaments/${tournamentId}/leaderboard`)}
              className="w-full h-12 rounded-xl font-display font-semibold text-base text-white bg-arena-purple hover:bg-arena-purple-bright active:scale-[0.98] active:opacity-90 transition-all select-none"
            >
              View leaderboard
            </button>
          )}

          <button
            onClick={handleBack}
            className={cn(
              'w-full h-12 rounded-xl font-display font-semibold text-base transition-all select-none',
              tournamentId
                ? 'text-arena-text-secondary bg-arena-surface border border-arena-border hover:border-arena-border-emphasis hover:text-arena-text-primary'
                : 'text-white bg-arena-purple hover:bg-arena-purple-bright active:scale-[0.98] active:opacity-90',
            )}
          >
            {tournamentId ? 'Back to tournaments' : 'Back to lobby'}
          </button>

          <button
            onClick={handleShare}
            className="w-full h-11 rounded-xl text-sm text-arena-text-tertiary hover:text-arena-text-secondary border border-arena-border hover:border-arena-border-emphasis transition-colors flex items-center justify-center gap-2 select-none"
          >
            <Share2 className="h-4 w-4" />
            Share result
          </button>
        </div>

      </div>

      {/* Report reason picker — preserved from original; dialog approach kept for UX clarity */}
      <Dialog
        open={!!reportingQuestion}
        onOpenChange={(open) => { if (!open) setReportingQuestion(null); }}
      >
        <DialogContent className="bg-arena-surface border-arena-border text-white max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-white text-base font-display">What's the issue?</DialogTitle>
          </DialogHeader>
          <p className="text-white/40 text-xs leading-snug line-clamp-2">
            {reportingQuestion?.content}
          </p>
          {reportingQuestion && (
            <ReportQuestionPicker
              questionId={reportingQuestion.id}
              onClose={() => setReportingQuestion(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
