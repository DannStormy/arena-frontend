import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Flag, Trophy, XCircle, Equal, Zap, ChevronUp, ChevronDown, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReportQuestionPicker } from '@/components/common/ReportQuestionPicker';
import { Particles } from '@/components/common/Particles';
import { ProgressionReveal } from '@/components/common/ProgressionReveal';
import { TierBadge } from '@/components/common/TierBadge';
import { useDuel } from '@/hooks/use-duels';
import { useDuelStore } from '@/stores/duel.store';
import { useAuthStore } from '@/stores/auth.store';
import { disconnectDuelSocket } from '@/lib/duel-socket';
import { type DuelCompletePayload } from '@/types/duel.types';
import type { TournamentArena } from '@/types/tournament.types';

const ARENA_LABELS: Record<TournamentArena, string> = {
  naija_street_smarts: 'Naija Street Smarts',
  sports_arena: 'Sports Arena',
  entertainment_zone: 'Entertainment Zone',
  brain_box: 'Brain Box',
  faith_and_values: 'Faith & Values',
  tech_and_hustle: 'Tech & Hustle',
};

type ResultState = DuelCompletePayload & {
  challengerCorrect?: number;
  opponentCorrect?: number;
  questionSummary?: {
    questionIndex: number;
    challengerResult: string;
    opponentResult: string;
    questionId?: string;
  }[];
  forfeited?: boolean;
  forfeitedBy?: string;
};

export function DuelResultPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
  const { resetDuel } = useDuelStore();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [reportingQuestion, setReportingQuestion] = useState<{
    id: string;
    index: number;
  } | null>(null);

  const result = location.state as ResultState | null;
  const { data: duel, isLoading } = useDuel(id!);

  useEffect(() => { disconnectDuelSocket(); }, []);

  if (!result && isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-arena-bg">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const iAmChallenger = duel?.challengerId === userId;
  const myScore = result
    ? (iAmChallenger ? result.challengerScore : result.opponentScore)
    : (iAmChallenger ? duel?.challengerScore ?? 0 : duel?.opponentScore ?? 0);
  const theirScore = result
    ? (iAmChallenger ? result.opponentScore : result.challengerScore)
    : (iAmChallenger ? duel?.opponentScore ?? 0 : duel?.challengerScore ?? 0);
  const myUsername   = iAmChallenger ? duel?.challengerUsername : duel?.opponentUsername;
  const opponentName = iAmChallenger ? duel?.opponentUsername   : duel?.challengerUsername;

  const totalQ    = duel?.totalQuestions ?? 0;
  const myCorrect = result
    ? (iAmChallenger ? result.challengerCorrect : result.opponentCorrect)
    : (iAmChallenger ? duel?.challengerCorrect : duel?.opponentCorrect) ?? null;
  const theirCorrect = result
    ? (iAmChallenger ? result.opponentCorrect : result.challengerCorrect)
    : (iAmChallenger ? duel?.opponentCorrect : duel?.challengerCorrect) ?? null;
  const questionSummary = result?.questionSummary ?? duel?.questionSummary;
  const myAccuracy    = myCorrect    != null && totalQ > 0 ? Math.round((myCorrect    / totalQ) * 100) : null;
  const theirAccuracy = theirCorrect != null && totalQ > 0 ? Math.round((theirCorrect / totalQ) * 100) : null;

  const suddenDeathRounds = result?.suddenDeathRounds ?? duel?.suddenDeathRounds ?? 0;
  const isSuddenDeath = duel?.mode === 'sudden_death';
  const eliminatedOn  = `Q${(duel?.currentQuestionIndex ?? 0) + 1}`;
  const iWon     = duel?.winnerId === userId;
  const isTie    = duel?.isTie ?? result?.isTie ?? false;
  const forfeited    = result?.forfeited;
  const forfeitedBy  = result?.forfeitedBy;
  const prizeWon    = result?.prizeWon;
  const progression  = result?.myProgression ?? null;
  // Tier badge for MY column — use post-duel rank so it reflects the latest standing.
  // TODO(BE): opponent's tier requires backend to include opponentProgression or
  // challengerTier/opponentTier fields in the duel response.
  const myRankAfter  = result?.myProgression?.rankAfter ?? null;

  if (result && !result.myProgression) {
    console.warn('[ProgressionReveal] duel_complete payload missing myProgression — XP reveal will not show', result);
  }

  // Tiebreaker — second-person on winner's screen, third-person on loser's
  const tiebreakMs = duel?.tiebreakDeltaMs;
  const tiebreakLine = tiebreakMs
    ? `Tiebreaker · ${iWon ? 'You were' : `${opponentName ?? 'Opponent'} was`} ${(tiebreakMs / 1000).toFixed(1)}s faster`
    : null;

  // ── Outcome ────────────────────────────────────────────────────────────────
  let outcomeLabel: string;
  let outcomeIcon: React.ReactNode;
  let outcomeGradient: string;

  if (forfeited) {
    const iForfeited = forfeitedBy === userId;
    outcomeLabel    = iForfeited ? 'You Forfeited' : 'Opponent Forfeited';
    outcomeIcon     = iForfeited
      ? <Flag className="h-14 w-14 text-white/30" />
      : <Trophy className="h-14 w-14 text-arena-gold" />;
    outcomeGradient = iForfeited
      ? 'from-white/10 to-transparent'
      : 'from-arena-gold/15 to-transparent';
  } else if (isTie) {
    outcomeLabel    = "It's a Tie";
    outcomeIcon     = <Equal className="h-14 w-14 text-white/30" />;
    outcomeGradient = 'from-white/10 to-transparent';
  } else if (iWon) {
    outcomeLabel    = 'You Won!';
    outcomeIcon     = <Trophy className="h-14 w-14 text-arena-win" />;
    outcomeGradient = 'from-arena-win/15 to-transparent';
  } else {
    outcomeLabel    = 'You Lost';
    outcomeIcon     = <XCircle className="h-14 w-14 text-white/20" />;
    outcomeGradient = 'from-white/8 to-transparent';
  }

  const modeLabel  = duel?.mode ? duel.mode.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';
  const arenaLabel = duel?.arena ? (ARENA_LABELS[duel.arena] ?? duel.arena) : '—';

  const handleShare = async () => {
    const outcome = iWon ? 'won' : isTie ? 'tied' : 'lost';
    const text = `I just ${outcome} a duel on Arena! ${myScore} vs ${theirScore}`;
    if (navigator.share) {
      await navigator.share({ title: 'Arena Duel', text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Result copied!');
    }
  };

  return (
    <div className="relative min-h-svh bg-arena-bg">
      <Particles />

      <div className="relative z-10 mx-auto w-full max-w-[640px] px-4 pt-safe-top pb-8">
        {/* Outcome header */}
        <div className={`flex flex-col items-center justify-center py-8 gap-3 rounded-b-3xl -mx-4 px-4 bg-gradient-to-b ${outcomeGradient} mb-4`}>
          <span className="animate-result-reveal">{outcomeIcon}</span>
          <p className="font-display text-3xl font-bold text-arena-text-primary animate-result-reveal">
            {outcomeLabel}
          </p>
          {suddenDeathRounds > 0 && !isTie && (
            <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: '#E8893B' }}>
              <Zap className="h-3.5 w-3.5" />
              Decided in sudden death
            </p>
          )}
          {tiebreakLine && (
            <p className="text-arena-text-secondary text-sm text-center">{tiebreakLine}</p>
          )}
          {parseFloat(prizeWon ?? '0') > 0 && iWon && (
            <div className="rounded-full bg-arena-win/10 border border-arena-win/25 px-4 py-1.5">
              <p className="text-arena-win text-sm font-semibold">+₦{prizeWon} added to wallet</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {/* Progression reveal — only when backend supplies the data */}
          {progression && <ProgressionReveal data={progression} />}

          {/* Score card */}
          <div className="rounded-2xl border border-arena-border bg-arena-surface p-5 animate-result-reveal">
            <div className="flex items-start justify-around">
              <div className="text-center">
                <p className="text-arena-text-tertiary text-xs mb-1.5 font-medium">
                  {myUsername ?? 'You'}
                </p>
                {myRankAfter && (
                  <div className="flex justify-center mb-2">
                    <TierBadge tier={myRankAfter} size="sm" />
                  </div>
                )}
                {isSuddenDeath ? (
                  <p className={cn('text-sm font-semibold mt-1', iWon ? 'text-arena-win' : 'text-arena-loss')}>
                    {iWon ? `Won on ${eliminatedOn}` : `Eliminated on ${eliminatedOn}`}
                  </p>
                ) : (
                  <>
                    <p className={cn('font-display text-5xl font-bold tabular-nums', iWon || isTie ? 'text-arena-text-primary' : 'text-[#55555F]')}>
                      {myScore}
                    </p>
                    {myCorrect != null && (
                      <div className="mt-2">
                        <p className="text-white/60 text-sm font-semibold">{myAccuracy}%</p>
                        <p className="text-white/30 text-xs">accuracy</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <p className="text-white/15 text-2xl font-bold pt-4">VS</p>

              <div className="text-center">
                <p className="text-arena-text-tertiary text-xs mb-2 font-medium">
                  {opponentName ?? 'Opponent'}
                </p>
                {isSuddenDeath ? (
                  <p className={cn('text-sm font-semibold mt-1', iWon ? 'text-arena-loss' : 'text-arena-win')}>
                    {iWon ? `Eliminated on ${eliminatedOn}` : `Won on ${eliminatedOn}`}
                  </p>
                ) : (
                  <>
                    <p className={cn('font-display text-5xl font-bold tabular-nums', !iWon || isTie ? 'text-arena-text-primary' : 'text-[#55555F]')}>
                      {theirScore}
                    </p>
                    {theirCorrect != null && (
                      <div className="mt-2">
                        <p className="text-white/60 text-sm font-semibold">{theirAccuracy}%</p>
                        <p className="text-white/30 text-xs">accuracy</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="rounded-2xl border border-arena-border bg-arena-surface p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-arena-text-primary text-sm font-semibold font-display">
                  {totalQ > 0
                    ? suddenDeathRounds > 0 ? `${totalQ - suddenDeathRounds}+SD` : `${totalQ}`
                    : '—'}
                </p>
                <p className="text-arena-text-tertiary text-xs mt-0.5">Questions</p>
              </div>
              <div>
                <p className="text-arena-text-primary text-sm font-semibold truncate font-display">{modeLabel}</p>
                <p className="text-arena-text-tertiary text-xs mt-0.5">Mode</p>
              </div>
              <div>
                <p className="text-arena-text-primary text-sm font-semibold truncate font-display">{arenaLabel}</p>
                <p className="text-arena-text-tertiary text-xs mt-0.5">Arena</p>
              </div>
            </div>
          </div>

          {/* Question breakdown */}
          {questionSummary && questionSummary.length > 0 && (
            <div className="rounded-2xl border border-arena-border bg-arena-surface overflow-hidden">
              <button
                onClick={() => setShowBreakdown((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-arena-text-secondary hover:text-arena-text-primary transition-colors"
              >
                <span className="font-medium">Question breakdown</span>
                {showBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showBreakdown && (
                <div className="border-t border-arena-border">
                  <div className="flex items-center justify-between px-4 py-2 text-xs text-arena-text-tertiary">
                    <span className="w-8">Q</span>
                    <span>You</span>
                    <span>Opponent</span>
                    <span className="w-6" />
                  </div>
                  <div className="divide-y divide-arena-border/40">
                    {questionSummary.map((q) => {
                      const myResult    = iAmChallenger ? q.challengerResult : q.opponentResult;
                      const theirResult = iAmChallenger ? q.opponentResult   : q.challengerResult;
                      return (
                        <div
                          key={q.questionIndex}
                          className="flex items-center justify-between px-4 py-2.5 text-sm"
                        >
                          <span className="text-arena-text-tertiary w-8 font-mono text-xs">
                            Q{q.questionIndex + 1}
                          </span>
                          <span className={myResult    === 'correct' ? 'text-arena-win' : 'text-arena-loss'}>
                            {myResult    === 'correct' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </span>
                          <span className={theirResult === 'correct' ? 'text-arena-win' : 'text-arena-loss'}>
                            {theirResult === 'correct' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </span>
                          {q.questionId ? (
                            <button
                              onClick={() => setReportingQuestion({ id: q.questionId!, index: q.questionIndex })}
                              className="w-6 text-arena-text-tertiary hover:text-white/60 transition-colors"
                              title="Report this question"
                            >
                              <Flag className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="w-6" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions — sit immediately under content, no forced float */}
          <div className="pt-2 space-y-3">
            <Button
              onClick={() => navigate('/duels/create', { state: { mode: duel?.mode, arena: duel?.arena } })}
              className="w-full h-12 text-white font-semibold transition-all active:scale-[0.98] hover:brightness-[1.06]"
              style={{ background: 'linear-gradient(150deg, #E8893B, #C2541E)' }}
            >
              Rematch
            </Button>
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-arena-border py-3 text-sm text-arena-text-secondary hover:text-arena-text-primary hover:bg-white/5 transition-colors"
            >
              Share result
            </button>
            <button
              onClick={() => { resetDuel(); navigate('/duels'); }}
              className="w-full text-center text-sm text-arena-text-tertiary hover:text-arena-text-secondary transition-colors py-2"
            >
              Back to Duels
            </button>
          </div>
        </div>
      </div>

      <Dialog
        open={!!reportingQuestion}
        onOpenChange={(open) => { if (!open) setReportingQuestion(null); }}
      >
        <DialogContent className="bg-arena-surface border-arena-border text-white max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-arena-text-primary text-base font-display">
              Report Q{reportingQuestion ? reportingQuestion.index + 1 : ''}
            </DialogTitle>
          </DialogHeader>
          <p className="text-arena-text-tertiary text-xs">What's wrong with this question?</p>
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
