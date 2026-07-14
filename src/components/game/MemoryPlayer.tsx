import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EMBER } from '@/lib/ember';
import * as sfx from '@/lib/sfx';
import * as haptics from '@/lib/haptics';
import type { Challenge } from '@/types/challenge.types';

/**
 * The moment-to-moment play loop for Memory — a Simon-style light-sequence game.
 * Mirrors ChallengePlayer's contract (challenges / onValidate / onComplete /
 * onQuit / accent / submitting) so any surface can drop in the right player for
 * its `mode`: ChallengePlayer for speed_math (keypad), MemoryPlayer for memory
 * (tile grid). Shared by solo Memory practice and the Daily on a memory day.
 *
 * Backend contract: mode='memory', each challenge's client payload is
 *   { index, type:'memory', difficulty, answerType:'sequence',
 *     prompt:{ sequence:number[], gridSize:number }, maxScore, timeLimitMs }
 * The server strips the answer; we flash prompt.sequence, let the player tap the
 * tiles back, then submit the tapped indices as `answer` (number[]).
 *
 * `onValidate` is called per round for authoritative scoring/feedback; the full
 * run ({ index, answer, elapsedMs }[]) is collected and handed to `onComplete`
 * after the final round (same answers shape ChallengePlayer emits).
 */

type SubPhase = 'watch' | 'input' | 'feedback';

interface RoundFeedback {
  correct: boolean;
  score: number;
}

export interface MemoryPlayerProps {
  challenges: Challenge[];
  /** Per-answer validation. Return the authoritative { correct, score }. */
  onValidate: (
    challenge: Challenge,
    answer: number[],
    elapsedMs: number,
  ) => Promise<RoundFeedback>;
  /** Called once with the whole run when every challenge is answered. */
  onComplete: (answers: { index: number; answer: number[]; elapsedMs: number }[]) => void;
  /** Quit / close (top-left X). */
  onQuit?: () => void;
  /** Accent colour for status/score/progress. */
  accent?: string;
  /** Whether a network submit is in flight after the last challenge. */
  submitting?: boolean;
}

export function MemoryPlayer({
  challenges,
  onValidate,
  onComplete,
  onQuit,
  accent = EMBER.mode.streak,
  submitting = false,
}: MemoryPlayerProps) {
  const [index, setIndex] = useState(0);
  const [liveScore, setLiveScore] = useState(0);

  const scoreRef = useRef(0);
  const runRef = useRef<{ index: number; answer: number[]; elapsedMs: number }[]>([]);

  const total = challenges.length;

  // Per-round validation: bank the authoritative score for the HUD and record
  // the answer into the run. Only ever recorded on success (a throw lets the
  // round reset + retry, mirroring ChallengePlayer's rollback).
  const handleValidate = useCallback(
    async (challenge: Challenge, answer: number[], elapsedMs: number): Promise<RoundFeedback> => {
      const result = await onValidate(challenge, answer, elapsedMs);
      runRef.current.push({ index: challenge.index, answer, elapsedMs });
      scoreRef.current += result.score;
      setLiveScore(scoreRef.current);
      return result;
    },
    [onValidate],
  );

  const handleNext = useCallback(() => {
    setIndex((i) => {
      const next = i + 1;
      if (next >= total) {
        onComplete(runRef.current);
        return i;
      }
      return next;
    });
  }, [total, onComplete]);

  const challenge = challenges[index];

  if (!challenge) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MemoryRound
        key={index}
        challenge={challenge}
        index={index}
        total={total}
        score={liveScore}
        accent={accent}
        submitting={submitting}
        onValidate={handleValidate}
        onNext={handleNext}
        onQuit={onQuit}
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
  accent: string;
  submitting?: boolean;
  onValidate: (challenge: Challenge, answer: number[], elapsedMs: number) => Promise<RoundFeedback>;
  onNext: () => void;
  onQuit?: () => void;
}

const FLASH_MS = 460;
const FLASH_GAP_MS = 200;

function MemoryRound({
  challenge,
  index,
  total,
  score,
  accent,
  submitting = false,
  onValidate,
  onNext,
  onQuit,
}: MemoryRoundProps) {
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
        ? accent
        : EMBER.textSecondary;

  return (
    <>
      {/* Top bar — quit + progress + score */}
      <div className="flex items-center justify-between px-4 pt-4">
        {onQuit ? (
          <button
            onClick={onQuit}
            disabled={submitting}
            className="flex h-9 w-9 items-center justify-center disabled:opacity-40"
            style={{ color: EMBER.textTertiary }}
            aria-label="Quit"
          >
            <X size={20} />
          </button>
        ) : (
          <span className="h-9 w-9" />
        )}
        <p className="font-display text-sm font-semibold tracking-wide" style={{ color: EMBER.textSecondary }}>
          {index + 1}
          <span style={{ color: EMBER.textTertiary }}> / {total}</span>
        </p>
        <p
          className="font-display text-lg font-bold tabular-nums"
          style={{ color: accent, minWidth: '3ch', textAlign: 'right' }}
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
                  background: done ? accent : 'rgba(255,255,255,0.14)',
                }}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
