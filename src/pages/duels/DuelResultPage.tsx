import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReportQuestionPicker } from '@/components/common/ReportQuestionPicker';
import { useDuel } from '@/hooks/use-duels';
import { useDuelStore } from '@/stores/duel.store';
import { useAuthStore } from '@/stores/auth.store';
import { disconnectDuelSocket } from '@/lib/duel-socket';
import { type DuelCompletePayload } from '@/types/duel.types';
import type { TournamentArena } from '@/types/tournament.types';

const ARENA_CONFIG: Record<TournamentArena, { label: string }> = {
  naija_street_smarts: { label: 'Naija Street Smarts' },
  sports_arena: { label: 'Sports Arena' },
  entertainment_zone: { label: 'Entertainment Zone' },
  brain_box: { label: 'Brain Box' },
  faith_and_values: { label: 'Faith & Values' },
  tech_and_hustle: { label: 'Tech & Hustle' },
};

export function DuelResultPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
  const { resetDuel } = useDuelStore();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [reportingQuestion, setReportingQuestion] = useState<{ id: string; index: number } | null>(null);

  const result = location.state as (DuelCompletePayload & {
    challengerCorrect?: number;
    opponentCorrect?: number;
    questionSummary?: { questionIndex: number; challengerResult: string; opponentResult: string; questionId?: string }[];
    forfeited?: boolean;
    forfeitedBy?: string;
  }) | null;

  const { data: duel, isLoading } = useDuel(id!);

  useEffect(() => {
    disconnectDuelSocket();
  }, []);

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
  const myUsername = iAmChallenger ? duel?.challengerUsername : duel?.opponentUsername;
  const opponentName = iAmChallenger ? duel?.opponentUsername : duel?.challengerUsername;
  const totalQ = duel?.totalQuestions ?? 0;
  const myCorrect = result
    ? (iAmChallenger ? result.challengerCorrect : result.opponentCorrect)
    : (iAmChallenger ? duel?.challengerCorrect : duel?.opponentCorrect) ?? null;
  const theirCorrect = result
    ? (iAmChallenger ? result.opponentCorrect : result.challengerCorrect)
    : (iAmChallenger ? duel?.opponentCorrect : duel?.challengerCorrect) ?? null;
  const questionSummary = result?.questionSummary ?? duel?.questionSummary;
  const myAccuracy = myCorrect != null && totalQ > 0 ? Math.round((myCorrect / totalQ) * 100) : null;
  const theirAccuracy = theirCorrect != null && totalQ > 0 ? Math.round((theirCorrect / totalQ) * 100) : null;
  const suddenDeathRounds = result?.suddenDeathRounds ?? duel?.suddenDeathRounds ?? 0;
  const isSuddenDeath = duel?.mode === 'sudden_death';
  const eliminatedOn = `Q${(duel?.currentQuestionIndex ?? 0) + 1}`;
  const iWon = duel?.winnerId === userId;
  const mySDLabel = iWon ? `Won on ${eliminatedOn}` : `Eliminated on ${eliminatedOn}`;
  const theirSDLabel = iWon ? `Eliminated on ${eliminatedOn}` : `Won on ${eliminatedOn}`;
  const isTie = duel?.isTie ?? result?.isTie ?? false;
  const forfeited = result?.forfeited;
  const forfeitedBy = result?.forfeitedBy;
  const prizeWon = result?.prizeWon;

  let outcomeLabel: string;
  let outcomeIcon: string;
  let outcomeColor: string;

  if (forfeited) {
    const iForfeited = forfeitedBy === userId;
    outcomeLabel = iForfeited ? 'You Forfeited' : 'Opponent Forfeited';
    outcomeIcon = iForfeited ? '🏳️' : '🏆';
    outcomeColor = iForfeited ? 'text-white/50' : 'text-arena-gold';
  } else if (isTie) {
    outcomeLabel = "It's a Tie!";
    outcomeIcon = '🤝';
    outcomeColor = 'text-white';
  } else if (iWon) {
    outcomeLabel = 'You Won!';
    outcomeIcon = '🏆';
    outcomeColor = 'text-arena-gold';
  } else {
    outcomeLabel = 'You Lost';
    outcomeIcon = '😤';
    outcomeColor = 'text-white/70';
  }

  const modeLabel = duel?.mode
    ? duel.mode.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : '—';
  const arenaLabel = duel?.arena ? (ARENA_CONFIG[duel.arena]?.label ?? duel.arena) : '—';

  const handleShare = async () => {
    const outcome = iWon ? 'won' : isTie ? 'tied' : 'lost';
    const text = `I just ${outcome} a duel on Arena! ⚔️ ${myScore} vs ${theirScore}`;
    if (navigator.share) {
      await navigator.share({ title: 'Arena Duel', text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Result copied!');
    }
  };

  return (
    <div className="flex flex-col min-h-svh bg-arena-bg px-4 pt-safe-top">
      {/* Header */}
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <span className="text-6xl">{outcomeIcon}</span>
        <p className={`text-3xl font-black ${outcomeColor}`}>{outcomeLabel}</p>
        {suddenDeathRounds > 0 && !isTie && (
          <p className="text-white/60 text-sm mt-1">⚡ Won by fastest answer in sudden death</p>
        )}
        {prizeWon && prizeWon !== '0' && iWon && (
          <div className="rounded-full bg-arena-gold/10 border border-arena-gold/30 px-4 py-1.5">
            <p className="text-arena-gold text-sm font-semibold">+₦{prizeWon} added to wallet</p>
          </div>
        )}
      </div>

      <div className="space-y-4 flex-1">
        {/* Score card */}
        <div className="rounded-xl border border-arena-border bg-arena-surface p-5">
          <div className="flex items-start justify-around">
            <div className="text-center">
              <p className="text-white/60 text-xs mb-1">{myUsername ?? 'You'}</p>
              {isSuddenDeath ? (
                <p className={`text-sm font-semibold mt-1 ${iWon ? 'text-arena-green' : 'text-arena-red'}`}>
                  {mySDLabel}
                </p>
              ) : (
                <>
                  <p className="text-white text-4xl font-black tabular-nums">{myScore}</p>
                  {myCorrect != null && (
                    <div className="mt-1.5">
                      <p className="text-white/50 text-sm font-semibold">{myAccuracy}%</p>
                      <p className="text-white/30 text-xs">accuracy</p>
                    </div>
                  )}
                </>
              )}
            </div>
            <p className="text-white/30 text-xl font-bold pt-3">VS</p>
            <div className="text-center">
              <p className="text-white/60 text-xs mb-1">{opponentName ?? 'Opponent'}</p>
              {isSuddenDeath ? (
                <p className={`text-sm font-semibold mt-1 ${iWon ? 'text-arena-red' : 'text-arena-green'}`}>
                  {theirSDLabel}
                </p>
              ) : (
                <>
                  <p className="text-white text-4xl font-black tabular-nums">{theirScore}</p>
                  {theirCorrect != null && (
                    <div className="mt-1.5">
                      <p className="text-white/50 text-sm font-semibold">{theirAccuracy}%</p>
                      <p className="text-white/30 text-xs">accuracy</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="rounded-xl border border-arena-border bg-arena-surface p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-white text-sm font-semibold">
                {totalQ > 0
                  ? suddenDeathRounds > 0
                    ? `${totalQ - suddenDeathRounds} + SD`
                    : `${totalQ}`
                  : '—'}
              </p>
              <p className="text-white/40 text-xs mt-0.5">Questions</p>
            </div>
            <div>
              <p className="text-white text-sm font-semibold truncate">{modeLabel}</p>
              <p className="text-white/40 text-xs mt-0.5">Mode</p>
            </div>
            <div>
              <p className="text-white text-sm font-semibold truncate">{arenaLabel}</p>
              <p className="text-white/40 text-xs mt-0.5">Arena</p>
            </div>
          </div>
        </div>

        {/* Question breakdown */}
        {questionSummary && questionSummary.length > 0 && (
          <div className="rounded-xl border border-arena-border bg-arena-surface overflow-hidden">
            <button
              onClick={() => setShowBreakdown((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/60 hover:text-white transition-colors"
            >
              <span>View breakdown</span>
              <span className="text-xs">{showBreakdown ? '▲' : '▼'}</span>
            </button>
            {showBreakdown && (
              <div className="border-t border-arena-border">
                <div className="flex items-center justify-between px-4 py-2 text-xs text-white/30">
                  <span className="w-8">Q</span>
                  <span>You</span>
                  <span>Opponent</span>
                  <span className="w-6" />
                </div>
                <div className="divide-y divide-arena-border/40">
                  {questionSummary.map((q) => {
                    const myResult = iAmChallenger ? q.challengerResult : q.opponentResult;
                    const theirResult = iAmChallenger ? q.opponentResult : q.challengerResult;
                    return (
                      <div
                        key={q.questionIndex}
                        className="flex items-center justify-between px-4 py-2.5 text-sm"
                      >
                        <span className="text-white/40 w-8">Q{q.questionIndex + 1}</span>
                        <span
                          className={
                            myResult === 'correct' ? 'text-arena-green font-bold' : 'text-arena-red font-bold'
                          }
                        >
                          {myResult === 'correct' ? '✓' : '✗'}
                        </span>
                        <span
                          className={
                            theirResult === 'correct' ? 'text-arena-green font-bold' : 'text-arena-red font-bold'
                          }
                        >
                          {theirResult === 'correct' ? '✓' : '✗'}
                        </span>
                        {q.questionId ? (
                          <button
                            onClick={() => setReportingQuestion({ id: q.questionId!, index: q.questionIndex })}
                            className="w-6 text-white/20 hover:text-arena-gold transition-colors"
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
      </div>

      {/* Actions */}
      <div className="py-6 space-y-3">
        <Button
          onClick={() =>
            navigate('/duels/create', { state: { mode: duel?.mode, arena: duel?.arena } })
          }
          className="w-full bg-arena-gold hover:bg-arena-gold/90 text-black font-semibold"
        >
          Rematch
        </Button>
        <button
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-arena-border py-3 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          Share result
        </button>
        <button
          onClick={() => {
            resetDuel();
            navigate('/duels');
          }}
          className="w-full text-center text-sm text-white/40 hover:text-white/70 transition-colors py-2"
        >
          Back to Duels
        </button>
      </div>

      <Dialog
        open={!!reportingQuestion}
        onOpenChange={(open) => { if (!open) setReportingQuestion(null); }}
      >
        <DialogContent className="bg-arena-surface border-arena-border text-white max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-white text-base">
              Report Q{reportingQuestion ? reportingQuestion.index + 1 : ''}
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/50 text-xs">What's the issue with this question?</p>
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
