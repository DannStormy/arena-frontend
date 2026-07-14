import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, RotateCcw, X } from 'lucide-react';
import { usePracticeSet, useValidateAnswer } from '@/hooks/use-challenges';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { JumpingLights } from '@/components/common/JumpingLights';
import { MemoryPlayer } from '@/components/game/MemoryPlayer';
import { EMBER } from '@/lib/ember';
import type { Challenge, ChallengeSetResponse } from '@/types/challenge.types';

/**
 * Memory — a Simon-style light-sequence game. Idle + results screens live here;
 * the play loop is the shared MemoryPlayer (mirrors ChallengePlayer's contract),
 * so the Daily can render the right player for its rotating `mode`.
 */

type Phase = 'idle' | 'playing' | 'results';

const ACCENT = EMBER.mode.streak; // warm coral — memory is building heat

export function MemoryPage() {
  const navigate = useNavigate();
  const practiceSet = usePracticeSet();
  const validate = useValidateAnswer();

  const [phase, setPhase] = useState<Phase>('idle');
  const [set, setSet] = useState<ChallengeSetResponse | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const scoreRef = useRef(0);
  const correctRef = useRef(0);

  const startSet = useCallback(async () => {
    const data = await practiceSet.mutateAsync({
      mode: 'memory',
      count: 10,
      difficulty: 3,
    });
    scoreRef.current = 0;
    correctRef.current = 0;
    setSet(data);
    setPhase('playing');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per-round validation — keep our own score/correct tally for the results view.
  const handleValidate = useCallback(
    async (challenge: Challenge, answer: number[], elapsedMs: number) => {
      if (!set) throw new Error('no set');
      const result = await validate.mutateAsync({
        matchSeed: set.matchSeed,
        mode: set.mode,
        difficulty: set.difficulty,
        index: challenge.index,
        answer,
        elapsedMs,
      });
      scoreRef.current += result.score;
      if (result.correct) correctRef.current += 1;
      return { correct: result.correct, score: result.score };
    },
    [set, validate],
  );

  const total = set?.challenges.length ?? 0;

  const handleComplete = useCallback(() => {
    setScore(scoreRef.current);
    setCorrectCount(correctRef.current);
    setPhase('results');
  }, []);

  // ── Idle / start screen ────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div
        className="relative flex h-[100dvh] flex-col items-center justify-center overflow-hidden px-6"
        style={{ background: EMBER.base }}
      >
        <button
          onClick={() => navigate('/')}
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center"
          style={{ color: EMBER.textTertiary }}
          aria-label="Back"
        >
          <X size={20} />
        </button>
        <div
          className="mb-6 flex items-center justify-center"
          style={{ width: 72, height: 72, background: 'rgba(212,102,76,0.16)' }}
        >
          <Brain size={34} style={{ color: ACCENT }} />
        </div>
        <h1 className="font-display text-2xl font-bold" style={{ color: EMBER.textPrimary }}>
          Memory
        </h1>
        <p className="mt-2 max-w-xs text-center text-sm" style={{ color: EMBER.textSecondary }}>
          Watch the lights, then tap them back in order. It gets longer. Solo
          practice — no stakes.
        </p>
        <button
          onClick={() => void startSet()}
          disabled={practiceSet.isPending}
          className="press-cta clip-card mt-8 flex h-14 w-full max-w-xs items-center justify-center gap-2 font-display text-base font-bold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(150deg, #E8893B, #B84230)' }}
        >
          {practiceSet.isPending ? <LoadingSpinner size="sm" /> : 'Start'}
        </button>
      </div>
    );
  }

  // ── Results screen ──────────────────────────────────────────────────────────
  if (phase === 'results') {
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const tone = accuracy >= 60 ? 'win' : accuracy >= 30 ? 'neutral' : 'loss';
    return (
      <div className="h-[100dvh] overflow-y-auto" style={{ background: EMBER.base }}>
        <div className="flex min-h-full flex-col items-center justify-center px-6 py-8">
          <JumpingLights tone={tone} bars={9} height={76} className="mb-6" />
          <p
            className="font-display text-xs font-semibold uppercase tracking-[0.12em]"
            style={{ color: EMBER.textTertiary }}
          >
            Round complete
          </p>
          <p className="mt-3 font-display text-6xl font-bold" style={{ color: EMBER.accentBright }}>
            {score.toLocaleString()}
          </p>
          <p className="mt-1 text-sm" style={{ color: EMBER.textSecondary }}>
            points
          </p>
          <div className="mt-8 flex w-full max-w-xs gap-3">
            <div className="clip-card flex-1 p-4 text-center" style={{ background: EMBER.surface }}>
              <p className="font-display text-2xl font-bold" style={{ color: EMBER.textPrimary }}>
                {correctCount}/{total}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: EMBER.textTertiary }}>
                Correct
              </p>
            </div>
            <div className="clip-card flex-1 p-4 text-center" style={{ background: EMBER.surface }}>
              <p className="font-display text-2xl font-bold" style={{ color: EMBER.textPrimary }}>
                {accuracy}%
              </p>
              <p className="mt-0.5 text-xs" style={{ color: EMBER.textTertiary }}>
                Accuracy
              </p>
            </div>
          </div>
          <button
            onClick={() => void startSet()}
            disabled={practiceSet.isPending}
            className="press-cta clip-card mt-8 flex h-14 w-full max-w-xs items-center justify-center gap-2 font-display text-base font-bold text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(150deg, #E8893B, #B84230)' }}
          >
            {practiceSet.isPending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <RotateCcw size={18} /> Play again
              </>
            )}
          </button>
          <button
            onClick={() => navigate('/')}
            className="mt-3 text-sm font-medium"
            style={{ color: EMBER.textTertiary }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ── Playing ─────────────────────────────────────────────────────────────────
  if (!set) {
    return (
      <div className="flex h-[100dvh] items-center justify-center" style={{ background: EMBER.base }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden" style={{ background: EMBER.base }}>
      <MemoryPlayer
        key={set.matchSeed}
        challenges={set.challenges}
        accent={ACCENT}
        onValidate={handleValidate}
        onComplete={handleComplete}
        onQuit={() => navigate('/')}
      />
    </div>
  );
}
