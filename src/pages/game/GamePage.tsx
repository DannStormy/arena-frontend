import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useNextQuestion, useSubmitAnswer } from '@/hooks/use-game-session';
import { useGameStore } from '@/stores/game.store';
import { useTournament, useTournamentLeaderboard } from '@/hooks/use-tournaments';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { TournamentHUD } from '@/components/game/TournamentHUD';
import { CountdownBar } from '@/components/game/CountdownBar';
import { QuestionCard } from '@/components/game/QuestionCard';
import { OptionButton } from '@/components/game/OptionButton';
import { EMBER } from '@/lib/ember';
import type { GameType } from '@/types/tournament.types';

// Both modes now use ember — one hot look across the whole app.
const GAME_TYPE_ACCENT: Record<GameType, string> = {
  lightning_trivia:  EMBER.accent,
  last_man_standing: '#FF7043',
};

export function GamePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const totalQuestionsFromState = location.state?.totalQuestions as number | undefined;
  const tournamentId = (location.state?.tournamentId as string | undefined) ?? '';

  const { setCurrentQuestion, recordAnswer, completeSession, totalAnswered, score } =
    useGameStore();

  const { data: question, refetch: fetchNext, isLoading: questionLoading } = useNextQuestion(sessionId!);
  const submitMutation = useSubmitAnswer(sessionId!);

  // Read-only display data for HUD — does not affect game flow
  const { data: tournament } = useTournament(tournamentId);
  const { data: leaderboard } = useTournamentLeaderboard(tournamentId);

  // ── Local UI state (unchanged) ────────────────────────────────────────────
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [correctIndex, setCorrectIndex]   = useState<number | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [timeLeft, setTimeLeft]           = useState(10);
  const [correctCount, setCorrectCount]   = useState(0);

  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAnsweredRef = useRef(false);

  // ── Answer submission (unchanged) ─────────────────────────────────────────
  const handleAnswer = async (index: number) => {
    if (hasAnsweredRef.current || !question) return;
    hasAnsweredRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setSelectedIndex(index);

    const result = await submitMutation.mutateAsync({
      questionId: question.id,
      selectedAnswer: index,
    });

    setCorrectIndex(result.correctAnswer);
    setFeedbackVisible(true);
    recordAnswer(result.isCorrect, result.score, result.totalAnswered, result.isFlagged);

    const nextCorrectCount = result.isCorrect ? correctCount + 1 : correctCount;
    if (result.isCorrect) setCorrectCount(nextCorrectCount);

    if (result.completed) {
      completeSession(result.finalScore ?? result.score);
      setTimeout(() => navigate(`/game/${sessionId}/result`, {
        state: {
          finalScore:     result.finalScore ?? result.score,
          totalAnswered:  result.totalAnswered,
          totalQuestions: totalQuestionsFromState,
          correctCount:   nextCorrectCount,
          isFlagged:      result.isFlagged,
          myProgression:  result.myProgression,
          tournamentId,
        },
      }), 1200);
      return;
    }

    setTimeout(() => {
      void fetchNext();
    }, 1200);
  };

  // ── Reset state on new question (unchanged) ───────────────────────────────
  useEffect(() => {
    if (question) {
      setCurrentQuestion(question);
      setSelectedIndex(null);
      setCorrectIndex(null);
      setFeedbackVisible(false);
      hasAnsweredRef.current = false;
      setTimeLeft(10);
    }
  }, [question, setCurrentQuestion]);

  // ── Countdown timer (unchanged — owns the timing) ─────────────────────────
  useEffect(() => {
    if (!question) return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
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
  }, [question]);

  // ── Auto-submit on timeout (unchanged) ────────────────────────────────────
  useEffect(() => {
    if (timeLeft === 0) {
      void handleAnswer(-1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!sessionId) return <Navigate to="/" replace />;

  if (questionLoading && !question) {
    return (
      <div className="flex min-h-svh items-center justify-center" style={{ background: EMBER.base }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ── Display-only derivations ──────────────────────────────────────────────
  const tq          = totalQuestionsFromState ?? 0;
  const gameType    = tournament?.gameType ?? 'lightning_trivia';
  const modeAccent  = GAME_TYPE_ACCENT[gameType];

  // Honest async standing: rank against players who have already finished.
  // "so far" in the HUD frames that this is not a live-field comparison.
  const myRank = leaderboard && totalAnswered > 0
    ? leaderboard.filter((e) => e.score > score).length + 1
    : null;
  const totalFinished = leaderboard?.length ?? 0;

  // Prize at current standing (top 3 only)
  const prizes   = [tournament?.prizeFirst, tournament?.prizeSecond, tournament?.prizeThird];
  const myPrize  = myRank && myRank <= 3 ? (prizes[myRank - 1] ?? null) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-svh" style={{ background: EMBER.base }}>

      {/* Solo HUD — score + game type + question progress + standing */}
      <TournamentHUD
        gameType={gameType}
        modeAccent={modeAccent}
        score={score}
        timeLeft={timeLeft}
        questionIndex={Math.min(totalAnswered, Math.max(tq - 1, 0))}
        totalQuestions={tq}
        myRank={myRank}
        totalFinished={totalFinished}
        myPrize={myPrize}
      />

      {/* Countdown bar — display only, bound to timeLeft above */}
      <CountdownBar timeLeft={timeLeft} timerMax={10} modeAccent={modeAccent} />

      {/* ── Scrollable content ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {question && (
          <>
            <div className="flex-1 px-4 pt-6 pb-4 flex flex-col justify-center">
              <QuestionCard content={question.content} modeAccent={modeAccent} />
            </div>

            <div className="px-4 pb-6 space-y-2.5">
              {question.options.map((option, i) => {
                const isSelected = selectedIndex === i;
                const isCorrect  = feedbackVisible && correctIndex === i;
                const isWrong    = feedbackVisible && isSelected && correctIndex !== i;
                return (
                  <OptionButton
                    key={i}
                    letter={String.fromCharCode(65 + i)}
                    label={option}
                    isSelected={isSelected}
                    isCorrect={isCorrect}
                    isWrong={isWrong}
                    isDisabled={selectedIndex !== null}
                    onClick={() => handleAnswer(i)}
                    modeAccent={modeAccent}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
