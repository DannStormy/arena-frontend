import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useNextQuestion, useSubmitAnswer } from '@/hooks/use-game-session';
import { useGameStore } from '@/stores/game.store';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/lib/utils';

export function GamePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const totalQuestionsFromState = location.state?.totalQuestions as number | undefined;

  const { setCurrentQuestion, recordAnswer, completeSession, totalAnswered, score } =
    useGameStore();

  const { data: question, refetch: fetchNext, isLoading: questionLoading } = useNextQuestion(sessionId!);
  const submitMutation = useSubmitAnswer(sessionId!);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [correctCount, setCorrectCount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAnsweredRef = useRef(false);

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
          finalScore:    result.finalScore ?? result.score,
          totalAnswered: result.totalAnswered,
          totalQuestions: totalQuestionsFromState,
          correctCount:  nextCorrectCount,
          isFlagged:     result.isFlagged,
          myProgression: result.myProgression,
        },
      }), 1200);
      return;
    }

    setTimeout(() => {
      void fetchNext();
    }, 1200);
  };

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

  // Countdown timer — resets when a new question arrives
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

  // Auto-submit with -1 when time expires
  useEffect(() => {
    if (timeLeft === 0) {
      void handleAnswer(-1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  if (!sessionId) {
    return <Navigate to="/" replace />;
  }

  if (questionLoading && !question) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-arena-bg">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const tq = totalQuestionsFromState ?? 0;
  const progressPct = tq > 0 ? (totalAnswered / tq) * 100 : 0;

  return (
    <div className="flex flex-col min-h-svh bg-arena-bg">
      <div className="px-4 pt-safe-top pb-3 space-y-3">
        <Progress value={progressPct} className="h-1.5" />

        <div className="flex justify-between items-center text-sm text-white/50">
          <span>
            Q{totalAnswered + 1}/{tq}
          </span>
          <span
            className={cn(
              'font-bold tabular-nums text-base',
              timeLeft <= 3 ? 'text-arena-red' : 'text-white/70',
            )}
          >
            {timeLeft}s
          </span>
          <span className="text-arena-purple-bright font-semibold">{score} pts</span>
        </div>
      </div>

      <div className="flex-1 px-4 flex flex-col justify-center gap-6">
        {question && (
          <>
            <p className="text-white text-xl font-medium leading-snug">{question.content}</p>

            <div className="grid grid-cols-1 gap-3">
              {question.options.map((option, i) => {
                const isSelected = selectedIndex === i;
                const isCorrect = feedbackVisible && correctIndex === i;
                const isWrong = feedbackVisible && isSelected && correctIndex !== i;

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={selectedIndex !== null}
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
          </>
        )}
      </div>
    </div>
  );
}
