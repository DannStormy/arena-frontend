import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Skull, Trophy, Zap } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ModeIcon, getModeAccent } from '@/components/common/ModeIcon';
import { DuelHUD } from '@/components/game/DuelHUD';
import { CountdownBar } from '@/components/game/CountdownBar';
import { QuestionCard } from '@/components/game/QuestionCard';
import { OptionButton } from '@/components/game/OptionButton';
import { useDuelSocket } from '@/hooks/use-duel-socket';
import { useDuelStore } from '@/stores/duel.store';
import { useAuthStore } from '@/stores/auth.store';
import { getDuelSocket } from '@/lib/duel-socket';
import { DUEL_MODE_CONFIG, type Duel, type DuelForfeitedPayload } from '@/types/duel.types';

export function DuelGamePage() {
  const { id: duelId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const duelFromState = location.state?.duel as Duel | undefined;
  const token = useAuthStore((s) => s.token);
  const user  = useAuthStore((s) => s.user);

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
  const myScore   = iAmChallenger ? challengerScore : opponentScore;
  const theirScore = iAmChallenger ? opponentScore  : challengerScore;

  // ── Local UI state ────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft]           = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [stealTimeLeft, setStealTimeLeft] = useState(0);
  const [eliminatedBy, setEliminatedBy]   = useState<string | null>(null);

  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const stealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAnsweredRef           = useRef(false);
  const questionStartTimeRef     = useRef(Date.now());

  // ── Socket connection ─────────────────────────────────────────────────────
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

  // ── Reset local state on new question ────────────────────────────────────
  useEffect(() => {
    if (!currentQuestion) return;
    setSelectedIndex(null);
    setFeedbackVisible(false);
    hasAnsweredRef.current = false;
    questionStartTimeRef.current = Date.now();

    const timerSeconds = DUEL_MODE_CONFIG[mode ?? 'trivia']?.timerSeconds ?? null;
    setTimeLeft(timerSeconds);
  }, [currentQuestion, mode]);

  // ── Countdown timer ───────────────────────────────────────────────────────
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

  // ── Auto-submit on timeout ────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft === 0) {
      void handleAnswer(-1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // ── Show feedback when server confirms our answer ─────────────────────────
  useEffect(() => {
    if (correctAnswer !== null && hasAnsweredRef.current) {
      setFeedbackVisible(true);
    }
  }, [correctAnswer]);

  // ── Steal timer ───────────────────────────────────────────────────────────
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

  // ── Answer submission ─────────────────────────────────────────────────────
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

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!duelId) return <Navigate to="/duels" replace />;

  const isSuddenDeath = mode === 'sudden_death';
  const isStreakMode  = mode === 'streak';
  const timerMax      = DUEL_MODE_CONFIG[mode ?? 'trivia']?.timerSeconds ?? null;
  const modeAccent    = getModeAccent(mode ?? 'trivia');
  const myUsername    = user?.username ?? 'You';
  const opponentName  = opponentUsername ?? 'Opponent';

  // ── Waiting for first question ────────────────────────────────────────────
  if (!currentQuestion) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-5 bg-arena-bg">
        <ModeIcon mode={duelFromState?.mode ?? 'trivia'} size={44} iconSize={22} />
        <LoadingSpinner size="sm" />
        <p className="text-white/40 text-sm">
          {duelFromState?.mode ? DUEL_MODE_CONFIG[duelFromState.mode]?.label : 'Loading duel'}…
        </p>
      </div>
    );
  }

  // ── Sudden Death elimination overlay ─────────────────────────────────────
  if (eliminatedBy !== null) {
    const iAmEliminated = eliminatedBy === user?.id;
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-arena-bg">
        <div
          className="h-24 w-24 rounded-3xl flex items-center justify-center"
          style={{
            background: iAmEliminated ? 'rgba(255,77,94,0.12)' : 'rgba(45,212,167,0.12)',
          }}
        >
          {iAmEliminated
            ? <Skull className="h-12 w-12 text-arena-red" />
            : <Trophy className="h-12 w-12 text-arena-green" />}
        </div>
        <div className="text-center">
          <p
            className="font-display font-black text-4xl tracking-tight"
            style={{ color: iAmEliminated ? '#FF4D5E' : '#2DD4A7' }}
          >
            {iAmEliminated ? 'ELIMINATED' : 'YOU WIN!'}
          </p>
          <p className="text-white/50 text-sm mt-2">
            {iAmEliminated ? `${opponentName} won the duel` : 'Your opponent answered wrong'}
          </p>
        </div>
      </div>
    );
  }

  // ── Main game screen ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-svh bg-arena-bg">

      {/* HUD */}
      <DuelHUD
        mode={mode ?? 'trivia'}
        modeAccent={modeAccent}
        myUsername={myUsername}
        myAvatarUrl={user?.avatarUrl}
        myScore={myScore}
        myStreak={myStreak}
        opponentName={opponentName}
        opponentScore={theirScore}
        opponentStreak={opponentStreak}
        opponentHasAnswered={opponentHasAnswered}
        questionIndex={questionIndex}
        totalQuestions={totalQuestions}
        isSuddenDeath={isSuddenDeath}
        isStreakMode={isStreakMode}
      />

      {/* Countdown bar — display only, bound to existing timeLeft */}
      {timerMax !== null && (
        <CountdownBar
          timeLeft={timeLeft}
          timerMax={timerMax}
          modeAccent={modeAccent}
          isBlitz={mode === 'blitz'}
        />
      )}

      {/* ── Scrollable content ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-y-auto">

        {/* Question */}
        <div className="flex-1 px-4 pt-6 pb-4 flex flex-col justify-center">
          <QuestionCard content={currentQuestion.content} modeAccent={modeAccent} />
        </div>

        {/* Answer options */}
        <div className="px-4 pb-3 space-y-2.5">
          {currentQuestion.options.map((option, i) => {
            const isSelected = selectedIndex === i;
            const isCorrect  = feedbackVisible && correctAnswer === i;
            const isWrong    = feedbackVisible && isSelected && correctAnswer !== i;
            return (
              <OptionButton
                key={i}
                letter={String.fromCharCode(65 + i)}
                label={option}
                isSelected={isSelected}
                isCorrect={isCorrect}
                isWrong={isWrong}
                isDisabled={hasAnswered || selectedIndex !== null}
                onClick={() => handleAnswer(i)}
                modeAccent={modeAccent}
              />
            );
          })}
        </div>

        {/* Opponent beat — reacts when socket fires opponentHasAnswered */}
        <div className="px-4 pb-6 flex justify-center">
          {opponentHasAnswered ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
              style={{
                background:   `${modeAccent}14`,
                borderColor:  `${modeAccent}45`,
                color:        modeAccent,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full inline-block"
                style={{ background: modeAccent }}
              />
              {opponentName} answered
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/40">
              <span className="flex gap-0.5">
                <span className="h-1 w-1 rounded-full bg-white/40 animate-bounce [animation-delay:0ms]" />
                <span className="h-1 w-1 rounded-full bg-white/40 animate-bounce [animation-delay:150ms]" />
                <span className="h-1 w-1 rounded-full bg-white/40 animate-bounce [animation-delay:300ms]" />
              </span>
              {opponentName} thinking…
            </span>
          )}
        </div>

      </div>

      {/* ── Steal overlay — presented dramatically when socket fires ────── */}
      {stealOpportunity && (
        <div className="absolute inset-0 z-50 flex flex-col bg-arena-bg/98">

          {/* Header */}
          <div className="px-4 pt-safe-top py-6 text-center">
            <div
              className="inline-flex items-center justify-center h-10 w-10 rounded-2xl mb-3"
              style={{ background: `${getModeAccent('steal')}20` }}
            >
              <Zap className="h-5 w-5" style={{ color: getModeAccent('steal') }} />
            </div>
            <p
              className="font-display font-black text-lg tracking-wide"
              style={{ color: getModeAccent('steal') }}
            >
              STEAL OPPORTUNITY
            </p>
            <p className="text-white/50 text-sm mt-1">
              {opponentName} got this wrong — can you answer?
            </p>

            {/* Steal countdown */}
            <div className="mt-3 h-[3px] rounded-full bg-white/10 overflow-hidden mx-auto max-w-xs">
              <div
                className="h-full rounded-full"
                style={{
                  width:      `${(stealTimeLeft / stealOpportunity.timeoutSeconds) * 100}%`,
                  background: getModeAccent('steal'),
                  transition: 'width 1s linear',
                }}
              />
            </div>
            <p className="text-white/30 text-xs mt-1 tabular-nums">{stealTimeLeft}s</p>
          </div>

          {/* Steal question + options */}
          <div className="flex-1 px-4 pb-6 flex flex-col justify-center gap-4">
            <QuestionCard
              content={stealOpportunity.question.content}
              modeAccent={getModeAccent('steal')}
            />
            <div className="space-y-2.5">
              {stealOpportunity.question.options.map((option, i) => (
                <OptionButton
                  key={i}
                  letter={String.fromCharCode(65 + i)}
                  label={option}
                  isSelected={false}
                  isCorrect={false}
                  isWrong={false}
                  isDisabled={false}
                  onClick={() => handleAnswer(i, true)}
                  modeAccent={getModeAccent('steal')}
                />
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
