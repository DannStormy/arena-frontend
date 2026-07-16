import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, X, Zap } from 'lucide-react';
import { usePracticeSet, useValidateAnswer } from '@/hooks/use-challenges';
import { ChallengePlayer } from '@/components/game/ChallengePlayer';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ShareButton } from '@/components/share/ShareButton';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ResultCelebration, tierFromAccuracy } from '@/components/common/ResultCelebration';
import { XpLoader } from '@/components/common/XpLoader';
import { useMyProgression } from '@/hooks/use-progression';
import { EMBER } from '@/lib/ember';
import type { Challenge, ChallengeSetResponse } from '@/types/challenge.types';

type Phase = 'idle' | 'playing' | 'results';

const ACCENT = EMBER.mode.blitz; // amber — speed math burns hot/fast
// Mirrors arena-api SOLO_CHALLENGE_XP_PER_CORRECT — for the results XP-bar label
// (the authoritative XP still lives server-side; this only estimates the gain).
const SOLO_XP_PER_CORRECT = 30;

export function SpeedMathPage() {
  const navigate = useNavigate();
  const practiceSet = usePracticeSet();
  const validate = useValidateAnswer();

  const [phase, setPhase] = useState<Phase>('idle');
  const [set, setSet] = useState<ChallengeSetResponse | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // Level snapshot for the results XP bar — fetched once we reach the results
  // screen (by then the per-answer solo-XP awards have landed).
  const myProg = useMyProgression(phase === 'results');

  // Live accumulators the ChallengePlayer feeds via onValidate; snapshotted into
  // state on completion for the results screen.
  const scoreRef = useRef(0);
  const correctRef = useRef(0);

  const startSet = useCallback(async () => {
    const data = await practiceSet.mutateAsync({
      mode: 'speed_math',
      count: 10,
      difficulty: 6,
    });
    scoreRef.current = 0;
    correctRef.current = 0;
    setSet(data);
    setPhase('playing');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleValidate = useCallback(
    async (challenge: Challenge, answer: string, elapsedMs: number) => {
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

  const handleComplete = useCallback(() => {
    setScore(scoreRef.current);
    setCorrectCount(correctRef.current);
    setPhase('results');
  }, []);

  const total = set?.challenges.length ?? 0;

  // ── Idle / start screen ──────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div
        className="relative flex h-[100dvh] flex-col items-center justify-center overflow-hidden px-6"
        style={{ background: EMBER.base }}
      >
        <OfflineBanner floating />
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
          style={{ width: 72, height: 72, background: 'rgba(240,176,90,0.13)' }}
        >
          <Zap size={34} style={{ color: ACCENT }} />
        </div>
        <h1 className="font-display text-2xl font-bold" style={{ color: EMBER.textPrimary }}>
          Speed Math
        </h1>
        <p className="mt-2 max-w-xs text-center text-sm" style={{ color: EMBER.textSecondary }}>
          10 quick problems. Beat the clock, bank the points. Solo practice — no stakes.
        </p>
        <button
          onClick={() => void startSet()}
          disabled={practiceSet.isPending}
          className="press-cta clip-card mt-8 flex h-14 w-full max-w-xs items-center justify-center gap-2 font-display text-base font-bold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(150deg, #F0B05A, #C2541E)' }}
        >
          {practiceSet.isPending ? <LoadingSpinner size="sm" /> : 'Start'}
        </button>
      </div>
    );
  }

  // ── Results screen ─────────────────────────────────────────────────────────
  if (phase === 'results') {
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    // Tier the celebration by how it went — it should read as EARNED.
    const tier = tierFromAccuracy(accuracy);
    // XP bar: fill toward the current level, estimating this run's gain so the
    // fill animates up from where the run started.
    const lvl = myProg.data?.level;
    const gained = correctCount * SOLO_XP_PER_CORRECT;
    const span = lvl ? (lvl.xpToNext != null ? lvl.intoLevel + lvl.xpToNext : Math.max(1, lvl.intoLevel)) : 0;
    return (
      <div className="h-[100dvh] overflow-y-auto" style={{ background: EMBER.base }}>
        <div className="flex min-h-full flex-col items-center justify-center px-6 py-8">
        {/* Outcome-tiered celebration hero */}
        <ResultCelebration tier={tier} className="mb-6" />
        {lvl && (
          <XpLoader
            className="mb-6 w-full max-w-xs"
            level={lvl.number}
            fromInto={Math.max(0, lvl.intoLevel - gained)}
            toInto={lvl.intoLevel}
            span={span}
            gained={gained}
            leveledUp={lvl.intoLevel - gained < 0}
          />
        )}
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
        {/* Branded share card + Share button — the viral loop */}
        <div className="mt-8 w-full max-w-xs">
          <ShareButton
            preview
            fileName="arena-speed-math"
            label="Share result"
            shareText={`I scored ${score.toLocaleString()} on Arena Speed Math (${correctCount}/${total} correct). Beat that.`}
            card={{
              variant: 'speed_math',
              outcome: 'solo',
              eyebrow: 'Speed Math',
              kicker: 'I banked',
              headline: score.toLocaleString(),
              subhead: 'points banked',
              stats: [
                { label: 'Correct', value: `${correctCount}/${total}` },
                { label: 'Accuracy', value: `${accuracy}%` },
              ],
              cta: 'Beat that.',
            }}
          />
        </div>
        <button
          onClick={() => void startSet()}
          disabled={practiceSet.isPending}
          className="press-cta clip-card mt-3 flex h-14 w-full max-w-xs items-center justify-center gap-2 font-display text-base font-bold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(150deg, #F0B05A, #C2541E)' }}
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

  // ── Playing — delegate to the shared ChallengePlayer ────────────────────────
  if (!set) {
    return (
      <div className="flex h-[100dvh] items-center justify-center" style={{ background: EMBER.base }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden" style={{ background: EMBER.base }}>
      <ChallengePlayer
        challenges={set.challenges}
        accent={ACCENT}
        onValidate={handleValidate}
        onComplete={handleComplete}
        onQuit={() => navigate('/')}
      />
    </div>
  );
}
