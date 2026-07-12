import { useCallback, useEffect, useRef, useState } from 'react';
import { Delete, X } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EMBER } from '@/lib/ember';
import { cn } from '@/lib/utils';
import type { Challenge } from '@/types/challenge.types';
import type { AsyncDuelAnswerInput } from '@/types/async-duel.types';

/**
 * The moment-to-moment play loop shared by solo Speed Math practice and async
 * duels: render prompt.expression, a numeric keypad, a per-challenge countdown,
 * capture elapsedMs, and advance.
 *
 * Two feedback strategies via one prop:
 *  • Pass `onValidate` (solo) — each answer is checked immediately, the returned
 *    { correct, score } drives inline feedback, and the running score is shown.
 *  • Omit `onValidate` (async duel) — no per-answer feedback; the whole run is
 *    collected and handed to `onComplete` at the end for a single submit.
 *
 * Either way, `onComplete` receives the full run as AsyncDuelAnswerInput[].
 */

interface Feedback {
  correct: boolean;
  score: number;
}

export interface ChallengePlayerProps {
  challenges: Challenge[];
  /** Optional per-answer validation (solo). Return the authoritative score. */
  onValidate?: (
    challenge: Challenge,
    answer: string,
    elapsedMs: number,
  ) => Promise<Feedback>;
  /** Called once with the whole run when every challenge is answered. */
  onComplete: (answers: AsyncDuelAnswerInput[]) => void;
  /** Quit / close (top-left X). */
  onQuit?: () => void;
  /** Accent colour for the prompt/keypad theme. */
  accent?: string;
  /** Whether a network submit is in flight after the last challenge. */
  submitting?: boolean;
}

export function ChallengePlayer({
  challenges,
  onValidate,
  onComplete,
  onQuit,
  accent = EMBER.mode.blitz,
  submitting = false,
}: ChallengePlayerProps) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [score, setScore] = useState(0);
  const [timeFrac, setTimeFrac] = useState(1);

  const shownAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lockedRef = useRef(false); // guards double-submit per challenge
  const runRef = useRef<AsyncDuelAnswerInput[]>([]); // accumulates the whole run

  const total = challenges.length;
  const challenge: Challenge | undefined = challenges[index];

  const stopTimer = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const advance = useCallback(() => {
    setFeedback(null);
    setInput('');
    setIndex((i) => {
      const next = i + 1;
      if (next >= total) {
        onComplete(runRef.current);
        return i;
      }
      return next;
    });
  }, [total, onComplete]);

  const submit = useCallback(
    async (answer: string) => {
      if (!challenge || lockedRef.current) return;
      lockedRef.current = true;
      stopTimer();

      const elapsedMs = Math.max(0, Math.round(performance.now() - shownAtRef.current));
      runRef.current.push({ index: challenge.index, answer, elapsedMs });

      if (onValidate) {
        let result: Feedback;
        try {
          result = await onValidate(challenge, answer, elapsedMs);
        } catch {
          // Validation failed (toast handled by caller). Roll back this run
          // entry and unlock so the user can retry the same challenge.
          runRef.current.pop();
          lockedRef.current = false;
          return;
        }
        setFeedback(result);
        setScore((s) => s + result.score);
        window.setTimeout(advance, 850);
      } else {
        // Async duel — no feedback, advance immediately.
        advance();
      }
    },
    [challenge, onValidate, advance, stopTimer],
  );

  // Countdown + reset whenever a new challenge is shown.
  useEffect(() => {
    if (!challenge) return;
    lockedRef.current = false;
    shownAtRef.current = performance.now();
    const limit = challenge.timeLimitMs;

    const tick = () => {
      const elapsed = performance.now() - shownAtRef.current;
      const remaining = Math.max(limit - elapsed, 0);
      setTimeFrac(remaining / limit);
      if (remaining <= 0) {
        void submit(''); // time out — empty answer scores 0 server-side
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return stopTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, challenge?.index]);

  // Physical keyboard support (desktop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (feedback || lockedRef.current) return;
      if (e.key >= '0' && e.key <= '9') setInput((v) => (v.length < 9 ? v + e.key : v));
      else if (e.key === '-') setInput((v) => (v.length === 0 ? '-' : v));
      else if (e.key === 'Backspace') setInput((v) => v.slice(0, -1));
      else if (e.key === 'Enter' && input.trim() !== '' && input !== '-') void submit(input);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [feedback, input, submit]);

  const pressDigit = (d: string) => {
    if (feedback || lockedRef.current) return;
    setInput((v) => (v.length < 9 ? v + d : v));
  };
  const pressSign = () => {
    if (feedback || lockedRef.current) return;
    setInput((v) => (v.startsWith('-') ? v.slice(1) : '-' + v));
  };
  const pressBack = () => {
    if (feedback || lockedRef.current) return;
    setInput((v) => v.slice(0, -1));
  };
  const canSubmit = input.trim() !== '' && input !== '-' && !feedback && !lockedRef.current;

  const urgent = timeFrac <= 0.3;
  const danger = timeFrac <= 0.15;
  const barColor = danger ? '#FF4D5E' : urgent ? '#F5B73D' : accent;

  if (!challenge) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="flex flex-1 flex-col">
      {/* Top bar — quit + progress + score */}
      <div className="flex items-center justify-between px-4 pt-4">
        {onQuit ? (
          <button
            onClick={onQuit}
            className="flex h-9 w-9 items-center justify-center"
            style={{ color: EMBER.textTertiary }}
            aria-label="Quit"
          >
            <X size={20} />
          </button>
        ) : (
          <span className="h-9 w-9" />
        )}
        <p
          className="font-display text-sm font-semibold tracking-wide"
          style={{ color: EMBER.textSecondary }}
        >
          {index + 1}
          <span style={{ color: EMBER.textTertiary }}> / {total}</span>
        </p>
        {onValidate ? (
          <p className="font-display text-sm font-bold tabular-nums" style={{ color: accent }}>
            {score.toLocaleString()}
          </p>
        ) : (
          <span className="w-9" />
        )}
      </div>

      {/* Countdown bar */}
      <div className="mt-3 h-1 w-full overflow-hidden bg-white/5">
        <div
          className={cn('h-full', danger && 'motion-safe:animate-pulse')}
          style={{
            width: `${timeFrac * 100}%`,
            background: barColor,
            transition: 'background-color 0.3s ease',
          }}
        />
      </div>

      {/* Prompt + input */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <p
          className="font-display text-5xl font-bold tabular-nums sm:text-6xl"
          style={{ color: EMBER.textPrimary }}
        >
          {challenge.prompt.expression}
        </p>

        <div
          className="mt-8 flex min-h-[3.5rem] min-w-[8rem] items-center justify-center border-b-2 px-4 text-4xl font-bold tabular-nums transition-colors"
          style={{
            color: feedback
              ? feedback.correct
                ? EMBER.win
                : EMBER.lossInk
              : EMBER.textPrimary,
            borderColor: feedback
              ? feedback.correct
                ? EMBER.winBorder
                : EMBER.lossBorder
              : 'rgba(240,176,90,0.35)',
          }}
        >
          {input || <span style={{ color: EMBER.textTertiary }}>?</span>}
        </div>

        {/* Feedback line — reserved height to avoid layout shift (solo only) */}
        <div className="mt-4 h-6">
          {feedback && (
            <p
              className="animate-slide-up font-display text-sm font-bold"
              style={{ color: feedback.correct ? EMBER.win : EMBER.lossInk }}
            >
              {feedback.correct ? `+${feedback.score}` : 'Missed'}
            </p>
          )}
        </div>
      </div>

      {/* Keypad */}
      <div className="mx-auto w-full max-w-sm px-4 pb-6">
        <div className="grid grid-cols-3 gap-2">
          {keypad.map((d) => (
            <KeypadKey key={d} onClick={() => pressDigit(d)} disabled={!!feedback}>
              {d}
            </KeypadKey>
          ))}
          <KeypadKey onClick={pressSign} disabled={!!feedback}>
            <span className="text-2xl">±</span>
          </KeypadKey>
          <KeypadKey onClick={() => pressDigit('0')} disabled={!!feedback}>
            0
          </KeypadKey>
          <KeypadKey onClick={pressBack} disabled={!!feedback}>
            <Delete size={22} />
          </KeypadKey>
        </div>
        <button
          onClick={() => void submit(input)}
          disabled={!canSubmit || submitting}
          className="clip-card mt-2 flex h-14 w-full items-center justify-center font-display text-base font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: 'linear-gradient(150deg, #F0B05A, #C2541E)' }}
        >
          {submitting ? <LoadingSpinner size="sm" /> : 'Submit'}
        </button>
      </div>
    </div>
  );
}

// ── Keypad key ─────────────────────────────────────────────────────────────

interface KeypadKeyProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

function KeypadKey({ children, onClick, disabled }: KeypadKeyProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="clip-row flex h-14 items-center justify-center font-display text-2xl font-bold tabular-nums transition-all active:scale-[0.96] disabled:opacity-40"
      style={{ background: EMBER.surfaceRaised, color: EMBER.textPrimary }}
    >
      {children}
    </button>
  );
}
