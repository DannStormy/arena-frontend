import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Skull, Trophy, Flame } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useDuelSocket } from '@/hooks/use-duel-socket';
import { useDuelStore } from '@/stores/duel.store';
import { useAuthStore } from '@/stores/auth.store';
import { getDuelSocket } from '@/lib/duel-socket';
import { DUEL_MODE_CONFIG, type Duel, type DuelForfeitedPayload } from '@/types/duel.types';
import { cn } from '@/lib/utils';

export function DuelGamePage() {
  const { id: duelId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const duelFromState = location.state?.duel as Duel | undefined;
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const {
    mode,
    opponentUsername,
    currentQuestion,
    questionIndex,
    totalQuestions,
    myScore: challengerScore,
    opponentScore,
    myStreak,
    opponentStreak,
    hasAnswered,
    opponentHasAnswered,
    correctAnswer,
    stealOpportunity,
    isComplete,
  } = useDuelStore();

  const iAmChallenger = duelFromState?.challengerId === user?.id;
  const myScore = iAmChallenger ? challengerScore : opponentScore;
  const theirScore = iAmChallenger ? opponentScore : challengerScore;

  // Local UI state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [stealTimeLeft, setStealTimeLeft] = useState(0);
  const [eliminatedBy, setEliminatedBy] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAnsweredRef = useRef(false);
  const questionStartTimeRef = useRef(Date.now());

  // Socket connection
  useDuelSocket(duelId ?? null, {
    onDuelForfeited: (payload: DuelForfeitedPayload) => {
      setEliminatedBy(payload.forfeitedBy);
      setTimeout(() => {
        navigate(`/duels/${duelId}/result`, {
          state: { ...payload, winnerId: payload.winnerId, isTie: false, prizeWon: '0' },
        });
      }, 2500);
    },
    onDuelComplete: (payload) => {
      setTimeout(() => {
        navigate(`/duels/${duelId}/result`, { state: payload });
      }, 1200);
    },
  });

  // Reset local state when a new question arrives
  useEffect(() => {
    if (!currentQuestion) return;
    setSelectedIndex(null);
    setFeedbackVisible(false);
    hasAnsweredRef.current = false;
    questionStartTimeRef.current = Date.now();

    const timerSeconds = currentQuestion
      ? (DUEL_MODE_CONFIG[mode ?? 'trivia']?.timerSeconds ?? null)
      : null;

    setTimeLeft(timerSeconds);
  }, [currentQuestion, mode]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || !currentQuestion) return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null || t <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion]);

  // Auto-submit on timeout
  useEffect(() => {
    if (timeLeft === 0) {
      void handleAnswer(-1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // Show feedback when server confirms our answer
  useEffect(() => {
    if (correctAnswer !== null && hasAnsweredRef.current) {
      setFeedbackVisible(true);
    }
  }, [correctAnswer]);

  // Steal timer
  useEffect(() => {
    if (!stealOpportunity) {
      if (stealTimerRef.current) {
        clearInterval(stealTimerRef.current);
        stealTimerRef.current = null;
      }
      return;
    }

    setStealTimeLeft(stealOpportunity.timeoutSeconds);

    stealTimerRef.current = setInterval(() => {
      setStealTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(stealTimerRef.current!);
          stealTimerRef.current = null;
          useDuelStore.getState().clearStealOpportunity();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (stealTimerRef.current) {
        clearInterval(stealTimerRef.current);
        stealTimerRef.current = null;
      }
    };
  }, [stealOpportunity]);

  const handleAnswer = (index: number, isSteal = false) => {
    if (hasAnsweredRef.current || isComplete || !currentQuestion || !duelId || !token) return;
    if (!isSteal) {
      hasAnsweredRef.current = true;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!isSteal) {
      setSelectedIndex(index);
    }

    const timeTakenMs = Date.now() - questionStartTimeRef.current;
    const sock = getDuelSocket(token);

    if (isSteal) {
      sock.emit('submit_answer', {
        duelId,
        questionId: stealOpportunity!.questionId,
        selectedAnswer: index,
        timeTakenMs: 0,
        isSteal: true,
      });
      useDuelStore.getState().clearStealOpportunity();
    } else {
      sock.emit('submit_answer', {
        duelId,
        questionId: currentQuestion.id,
        selectedAnswer: index,
        timeTakenMs,
      });
    }
  };

  if (!duelId) return <Navigate to="/duels" replace />;

  // Waiting for first question
  if (!currentQuestion) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-arena-bg">
        <LoadingSpinner size="lg" />
        <p className="text-white/50 text-sm">
          {duelFromState?.mode ? DUEL_MODE_CONFIG[duelFromState.mode]?.label : 'Loading duel'}
          …
        </p>
      </div>
    );
  }

  const isSuddenDeath = mode === 'sudden_death';
  const isStreakMode = mode === 'streak';
  const timerMax = DUEL_MODE_CONFIG[mode ?? 'trivia']?.timerSeconds ?? null;
  const timerPct = timerMax && timeLeft !== null ? (timeLeft / timerMax) * 100 : 100;
  const timerDanger = timeLeft !== null && timeLeft <= 3;

  const myUsername = user?.username ?? 'You';
  const opponentName = opponentUsername ?? 'Opponent';

  // Sudden death eliminated overlay
  if (eliminatedBy !== null) {
    const iAmEliminated = eliminatedBy === user?.id;
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-arena-bg">
        <div
          className={cn(
            'text-6xl font-black tracking-widest animate-pulse',
            iAmEliminated ? 'text-arena-red' : 'text-arena-green',
          )}
        >
          {iAmEliminated
            ? <Skull className="h-14 w-14 mx-auto" />
            : <Trophy className="h-14 w-14 mx-auto" />}
        </div>
        <p
          className={cn(
            'text-3xl font-black tracking-widest',
            iAmEliminated ? 'text-arena-red' : 'text-arena-green',
          )}
        >
          {iAmEliminated ? 'ELIMINATED' : 'YOU WIN!'}
        </p>
        <p className="text-white/50 text-sm">
          {iAmEliminated ? `${opponentName} won the duel` : 'Your opponent answered wrong'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-svh bg-arena-bg">
      {/* HUD */}
      <div className="px-4 pt-safe-top pb-3 border-b border-arena-border">
        <div className="flex items-center justify-between gap-2">
          {/* My side */}
          <div className="flex-1">
            <p className="text-white/60 text-xs truncate">{myUsername}</p>
            {isSuddenDeath ? (
              <p className="text-arena-green text-sm font-bold">ALIVE</p>
            ) : (
              <p className="text-white text-xl font-bold tabular-nums">{myScore}</p>
            )}
            {isStreakMode && myStreak > 1 && (
              <p className="text-arena-gold text-xs flex items-center gap-0.5"><Flame className="h-3 w-3" />{myStreak}x</p>
            )}
          </div>

          {/* Center */}
          <div className="text-center shrink-0">
            <p className="text-white/40 text-xs">
              Q{questionIndex + 1}/{totalQuestions}
            </p>
            <p className="text-white/60 text-xs mt-0.5">
              {DUEL_MODE_CONFIG[mode ?? 'trivia']?.icon}
            </p>
          </div>

          {/* Opponent side */}
          <div className="flex-1 text-right">
            <p className="text-white/60 text-xs truncate">{opponentName}</p>
            {isSuddenDeath ? (
              <p className="text-arena-green text-sm font-bold">ALIVE</p>
            ) : (
              <p className="text-white text-xl font-bold tabular-nums">{theirScore}</p>
            )}
            {isStreakMode && opponentStreak > 1 && (
              <p className="text-arena-gold text-xs flex items-center gap-0.5">{opponentStreak}x<Flame className="h-3 w-3" /></p>
            )}
          </div>
        </div>

        {/* Timer bar */}
        {timerMax !== null && (
          <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-1000 ease-linear',
                timerDanger ? 'bg-arena-red animate-pulse' : 'bg-arena-purple',
              )}
              style={{ width: `${timerPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col px-4 py-5 gap-5">
        <p className="text-white text-xl font-medium leading-snug">{currentQuestion.content}</p>

        {/* Answer options */}
        <div className="grid grid-cols-1 gap-3">
          {currentQuestion.options.map((option, i) => {
            const isSelected = selectedIndex === i;
            const isCorrect = feedbackVisible && correctAnswer === i;
            const isWrong = feedbackVisible && isSelected && correctAnswer !== i;

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={hasAnswered || selectedIndex !== null}
                className={cn(
                  'w-full rounded-xl border p-4 text-left text-sm font-medium transition-colors',
                  'disabled:cursor-default',
                  isCorrect
                    ? 'bg-arena-green/20 border-arena-green text-white'
                    : isWrong
                      ? 'bg-arena-red/20 border-arena-red text-white'
                      : isSelected
                        ? 'bg-white/10 border-white/40 text-white'
                        : 'bg-arena-surface border-arena-border text-white hover:border-white/30',
                )}
              >
                <span className="mr-2 text-white/40">{String.fromCharCode(65 + i)}.</span>
                {option}
              </button>
            );
          })}
        </div>

        {/* Opponent status */}
        <div className="flex justify-center">
          {opponentHasAnswered ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-arena-green/10 border border-arena-green/30 px-3 py-1 text-xs text-arena-green">
              ✓ Opponent answered
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/40">
              <span className="flex gap-0.5">
                <span className="h-1 w-1 rounded-full bg-white/40 animate-bounce [animation-delay:0ms]" />
                <span className="h-1 w-1 rounded-full bg-white/40 animate-bounce [animation-delay:150ms]" />
                <span className="h-1 w-1 rounded-full bg-white/40 animate-bounce [animation-delay:300ms]" />
              </span>
              Opponent thinking
            </span>
          )}
        </div>
      </div>

      {/* Steal overlay */}
      {stealOpportunity && (
        <div className="absolute inset-0 z-50 flex flex-col bg-arena-bg/98">
          {/* Steal header */}
          <div className="px-4 pt-safe-top py-5 text-center">
            <p className="text-2xl mb-1">⚡</p>
            <p className="text-arena-purple-bright text-lg font-black tracking-wide">STEAL OPPORTUNITY!</p>
            <p className="text-white/60 text-sm mt-1">
              Opponent got this wrong. Can you answer?
            </p>

            {/* Steal timer */}
            <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden mx-auto max-w-xs">
              <div
                className="h-full rounded-full bg-arena-purple transition-all duration-1000 ease-linear"
                style={{
                  width: `${(stealTimeLeft / stealOpportunity.timeoutSeconds) * 100}%`,
                }}
              />
            </div>
            <p className="text-white/40 text-xs mt-1">{stealTimeLeft}s remaining</p>
          </div>

          <div className="flex-1 px-4 pb-6 flex flex-col justify-center gap-5">
            <p className="text-white text-xl font-medium leading-snug">
              {stealOpportunity.question.content}
            </p>

            <div className="grid grid-cols-1 gap-3">
              {stealOpportunity.question.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i, true)}
                  className="w-full rounded-xl border border-arena-border bg-arena-surface p-4 text-left text-sm font-medium text-white hover:border-white/25 hover:bg-arena-elev transition-colors"
                >
                  <span className="mr-2 text-white/40">{String.fromCharCode(65 + i)}.</span>
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
