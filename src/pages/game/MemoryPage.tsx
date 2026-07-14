import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, RotateCcw, X } from 'lucide-react';
import { usePracticeSet, useValidateAnswer } from '@/hooks/use-challenges';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { JumpingLights } from '@/components/common/JumpingLights';
import { EMBER } from '@/lib/ember';
import * as sfx from '@/lib/sfx';
import * as haptics from '@/lib/haptics';
import type { Challenge, ChallengeSetResponse } from '@/types/challenge.types';

/**
 * Memory — a Simon-style light-sequence game. NEW standalone play loop (does not
 * touch ChallengePlayer). Backend contract: mode='memory', each challenge's
 * client payload is
 *   { index, type:'memory', difficulty, answerType:'sequence',
 *     prompt:{ sequence:number[], gridSize:number }, maxScore, timeLimitMs }
 * The server strips the answer; we flash prompt.sequence, let the player tap the
 * tiles back, then submit the tapped indices as `answer` (number[]).
 *
 * Standards from tasks 1–3 apply: fixed viewport, reactive tiles + haptics, and
 * the shared jumping-lights results.
 */

type Phase = 'idle' | 'playing' | 'results';
type SubPhase = 'watch' | 'input' | 'feedback';

const ACCENT = EMBER.mode.streak; // warm coral — memory is building heat

interface RoundFeedback {
  correct: boolean;
  score: number;
}

export function MemoryPage() {
  const navigate = useNavigate();
  const practiceSet = usePracticeSet();
  const validate = useValidateAnswer();

  const [phase, setPhase] = useState<Phase>('idle');
  const [set, setSet] = useState<ChallengeSetResponse | null>(null);
  const [index, setIndex] = useState(0);
  const [liveScore, setLiveScore] = useState(0);
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
    setIndex(0);
    setLiveScore(0);
    setPhase('playing');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleValidate = useCallback(
    async (challenge: Challenge, answer: number[], elapsedMs: number): Promise<RoundFeedback> => {
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
      setLiveScore(scoreRef.current);
      return { correct: result.correct, score: result.score };
    },
    [set, validate],
  );

  const total = set?.challenges.length ?? 0;

  const handleNext = useCallback(() => {
    setIndex((i) => {
      const next = i + 1;
      if (next >= total) {
        setScore(scoreRef.current);
        setCorrectCount(correctRef.current);
        setPhase('results');
        return i;
      }
      return next;
    });
  }, [total]);

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

  const challenge = set.challenges[index];

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden" style={{ background: EMBER.base }}>
      <MemoryRound
        key={index}
        challenge={challenge}
        index={index}
        total={total}
        score={liveScore}
        onValidate={handleValidate}
        onNext={handleNext}
        onQuit={() => navigate('/')}
      />
    </div>
  );
}

// ── One challenge: watch → input → feedback ──────────────────────────────────

interface MemoryRoundProps {
  challenge: Challenge;
  index: number;
  total: number;
  score: number;
  onValidate: (challenge: Challenge, answer: number[], elapsedMs: number) => Promise<RoundFeedback>;
  onNext: () => void;
  onQuit: () => void;
}

const FLASH_MS = 460;
const FLASH_GAP_MS = 200;

function MemoryRound({ challenge, index, total, score, onValidate, onNext, onQuit }: MemoryRoundProps) {
  const sequence = challenge.prompt.sequence ?? [];
  const gridSize = challenge.prompt.gridSize ?? 9;
  const cols = Math.max(1, Math.round(Math.sqrt(gridSize)));

  const [subPhase, setSubPhase] = useState<SubPhase>('watch');
  const [activeTile, setActiveTile] = useState<number | null>(null);
  const [pressed, setPressed] = useState<number | null>(null);
  const [tapped, setTapped] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<RoundFeedback | null>(null);

  const startRef = useRef(0);
  const tappedRef = useRef<number[]>([]);
  const lockedRef = useRef(false);

  // Flash the sequence, then hand control to the player. All timers cleaned up
  // on unmount (the parent remounts this component per challenge via `key`).
  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];

    setSubPhase('watch');
    sequence.forEach((tile, i) => {
      const at = i * (FLASH_MS + FLASH_GAP_MS);
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          setActiveTile(tile);
          sfx.tick();
        }, at),
      );
      timers.push(
        window.setTimeout(() => {
          if (!cancelled) setActiveTile(null);
        }, at + FLASH_MS),
      );
    });

    const flashTotal = sequence.length * (FLASH_MS + FLASH_GAP_MS) + 150;
    timers.push(
      window.setTimeout(() => {
        if (cancelled) return;
        setSubPhase('input');
        startRef.current = performance.now();
      }, flashTotal),
    );

    // Soft deadline — auto-submit whatever's tapped when the input time is up.
    const limit = challenge.timeLimitMs > 0 ? challenge.timeLimitMs : 8000;
    timers.push(
      window.setTimeout(() => {
        if (!cancelled && !lockedRef.current) void submit(tappedRef.current);
      }, flashTotal + limit),
    );

    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = useCallback(
    async (answer: number[]) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      const elapsedMs = Math.max(0, Math.round(performance.now() - startRef.current));

      let result: RoundFeedback;
      try {
        result = await onValidate(challenge, answer, elapsedMs);
      } catch {
        // Validation failed (toast handled by caller). Let the player retry.
        lockedRef.current = false;
        setTapped([]);
        tappedRef.current = [];
        return;
      }

      setFeedback(result);
      setSubPhase('feedback');
      if (result.correct) {
        sfx.correct();
        haptics.success();
      } else {
        sfx.wrong();
        haptics.error();
      }
      window.setTimeout(onNext, 950);
    },
    [challenge, onValidate, onNext],
  );

  const handleTap = (tile: number) => {
    if (subPhase !== 'input' || lockedRef.current) return;
    sfx.unlock();
    haptics.tap();
    setPressed(tile);
    window.setTimeout(() => setPressed((p) => (p === tile ? null : p)), 180);

    const next = [...tappedRef.current, tile];
    tappedRef.current = next;
    setTapped(next);
    if (next.length >= sequence.length) void submit(next);
  };

  const statusText =
    subPhase === 'watch'
      ? 'Watch the lights'
      : subPhase === 'input'
        ? 'Your turn — tap them back'
        : feedback?.correct
          ? 'Nailed it'
          : 'Not quite';
  const statusColor =
    subPhase === 'feedback'
      ? feedback?.correct
        ? EMBER.accentBright
        : EMBER.lossInk
      : subPhase === 'input'
        ? ACCENT
        : EMBER.textSecondary;

  return (
    <>
      {/* Top bar — quit + progress + score */}
      <div className="flex items-center justify-between px-4 pt-4">
        <button
          onClick={onQuit}
          className="flex h-9 w-9 items-center justify-center"
          style={{ color: EMBER.textTertiary }}
          aria-label="Quit"
        >
          <X size={20} />
        </button>
        <p className="font-display text-sm font-semibold tracking-wide" style={{ color: EMBER.textSecondary }}>
          {index + 1}
          <span style={{ color: EMBER.textTertiary }}> / {total}</span>
        </p>
        <p
          className="font-display text-lg font-bold tabular-nums"
          style={{ color: ACCENT, minWidth: '3ch', textAlign: 'right' }}
        >
          {score.toLocaleString()}
        </p>
      </div>

      {/* Board */}
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-6">
        <p
          className="mb-6 font-display text-sm font-semibold uppercase tracking-[0.12em] transition-colors"
          style={{ color: statusColor }}
        >
          {statusText}
        </p>

        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: 10,
            width: 'min(84vw, 340px)',
          }}
        >
          {Array.from({ length: gridSize }).map((_, tile) => {
            const lit = activeTile === tile || pressed === tile;
            return (
              <button
                key={tile}
                type="button"
                onClick={() => handleTap(tile)}
                disabled={subPhase !== 'input'}
                aria-label={`Tile ${tile + 1}`}
                className="press-key clip-row aspect-square disabled:cursor-default"
                style={{
                  background: lit ? 'rgba(240,176,90,0.92)' : EMBER.surfaceRaised,
                  boxShadow: lit
                    ? '0 0 26px 2px rgba(240,176,90,0.65), inset 0 0 0 1.5px rgba(255,231,180,0.85)'
                    : 'inset 0 0 0 1px rgba(232,137,59,0.16)',
                  transition: 'background 130ms ease, box-shadow 130ms ease',
                }}
              />
            );
          })}
        </div>

        {/* Progress dots — how many taps entered vs needed */}
        <div className="mt-6 flex h-3 items-center gap-1.5">
          {sequence.map((_, i) => {
            const done = i < tapped.length;
            return (
              <span
                key={i}
                className="rounded-full"
                style={{
                  width: 7,
                  height: 7,
                  background: done ? ACCENT : 'rgba(255,255,255,0.14)',
                }}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
