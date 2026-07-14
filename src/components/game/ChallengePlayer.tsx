import { useCallback, useEffect, useRef, useState } from 'react';
import { Delete, Volume2, VolumeX, X } from 'lucide-react';
import { EmberFlame } from '@/components/common/EmberFlame';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EMBER } from '@/lib/ember';
import * as sfx from '@/lib/sfx';
import * as haptics from '@/lib/haptics';
import { cn } from '@/lib/utils';
import type { Challenge } from '@/types/challenge.types';
import type { AsyncDuelAnswerInput } from '@/types/async-duel.types';

/**
 * The moment-to-moment play loop shared by solo Speed Math practice and async
 * duels: render prompt.expression inside a tension timer ring, a numeric
 * keypad, capture elapsedMs, and advance.
 *
 * Two feedback strategies via one prop:
 *  • Pass `onValidate` (solo) — each answer is checked immediately, the returned
 *    { correct, score } drives the full juice layer (pop, particles, +N, score
 *    count-up, combo multiplier, sound, haptics) and the running score is shown.
 *  • Omit `onValidate` (async duel) — no per-answer feedback/combo/score; the
 *    whole run is collected and handed to `onComplete` for a single submit. The
 *    timer ring + danger ticks still apply (universal tension).
 *
 * Either way, `onComplete` receives the full run as AsyncDuelAnswerInput[].
 *
 * IMPORTANT: the combo multiplier is a VISUAL/emotional flourish only. It never
 * touches the authoritative per-answer score from `onValidate` nor the run sent
 * to the server.
 */

// Feedback palette — warm ember system, no cold green (see src/lib/ember.ts).
const GOLD = '#FFC93F'; // correct — bright, celebratory
const DANGER = '#FF4D5E'; // wrong / final-seconds urgency
const AMBER = '#F5B73D'; // mid-urgency timer step

// Precomputed fan-out directions for the correct-answer particle burst.
const PARTICLE_DIRS = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2 + (i % 2) * 0.5;
  const dist = 42 + (i % 3) * 14;
  return { tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist };
});

interface Feedback {
  correct: boolean;
  score: number;
}

/** One-shot juice payload; keyed by `id` so animations re-trigger on remount. */
interface Fx {
  id: number;
  correct: boolean;
  score: number;
  combo: number;
  particles: number;
  shake: boolean;
  brokeComboFrom?: number;
  timedOut: boolean;
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
  const [displayScore, setDisplayScore] = useState(0); // tweened toward `score`
  const [combo, setCombo] = useState(0);
  const [fx, setFx] = useState<Fx | null>(null);
  const [timeFrac, setTimeFrac] = useState(1);
  const [muted, setMuted] = useState(() => sfx.isMuted());

  const shownAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lockedRef = useRef(false); // guards double-submit per challenge
  const runRef = useRef<AsyncDuelAnswerInput[]>([]); // accumulates the whole run
  const comboRef = useRef(0); // authoritative combo count (state may lag)
  const fxIdRef = useRef(0);
  const lastTickRef = useRef(0); // last danger-zone tick timestamp
  const displayScoreRef = useRef(0);
  const reducedMotionRef = useRef(false);

  const total = challenges.length;
  const challenge: Challenge | undefined = challenges[index];

  // Track reduced-motion preference (used to collapse JS-driven motion to fades).
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mq.matches;
    const on = () => {
      reducedMotionRef.current = mq.matches;
    };
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  // Count the displayed score up to the authoritative score (~450ms), tabular.
  useEffect(() => {
    const from = displayScoreRef.current;
    const to = score;
    if (from === to) return;
    const start = performance.now();
    const dur = 450;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const value = Math.round(from + (to - from) * eased);
      displayScoreRef.current = value;
      setDisplayScore(value);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const vibrate = useCallback((pattern: number | number[]) => {
    try {
      if (!reducedMotionRef.current && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const advance = useCallback(() => {
    setFeedback(null);
    setFx(null);
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
    async (answer: string, timedOut = false) => {
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

        const rm = reducedMotionRef.current;
        const prevCombo = comboRef.current;
        const nextCombo = result.correct ? prevCombo + 1 : 0; // visual only
        comboRef.current = nextCombo;
        setCombo(nextCombo);

        setFeedback(result);
        setScore((s) => s + result.score);

        setFx({
          id: (fxIdRef.current += 1),
          correct: result.correct,
          score: result.score,
          combo: nextCombo,
          particles: result.correct && !rm ? Math.min(8 + nextCombo * 2, 16) : 0,
          shake: !result.correct && !rm,
          brokeComboFrom: !result.correct && prevCombo >= 2 ? prevCombo : undefined,
          timedOut,
        });

        if (result.correct) {
          sfx.correct(nextCombo);
          vibrate(18);
        } else {
          if (timedOut) sfx.timeout();
          else sfx.wrong();
          vibrate([28, 34, 28]);
        }

        window.setTimeout(advance, 850);
      } else {
        // Async duel — no feedback, advance immediately.
        advance();
      }
    },
    [challenge, onValidate, advance, stopTimer, vibrate],
  );

  // Countdown + reset whenever a new challenge is shown.
  useEffect(() => {
    if (!challenge) return;
    lockedRef.current = false;
    shownAtRef.current = performance.now();
    lastTickRef.current = 0;
    const limit = challenge.timeLimitMs;

    const tick = () => {
      const elapsed = performance.now() - shownAtRef.current;
      const remaining = Math.max(limit - elapsed, 0);
      const frac = remaining / limit;
      setTimeFrac(frac);

      // Danger zone: accelerating tick + light haptic (universal, both modes).
      if (frac <= 0.15 && !lockedRef.current) {
        const now = performance.now();
        const interval = 150 + (frac / 0.15) * 340; // ~490ms → ~150ms as it drains
        if (now - lastTickRef.current >= interval) {
          lastTickRef.current = now;
          sfx.tick();
          vibrate(12);
        }
      }

      if (remaining <= 0) {
        void submit('', true); // time out — empty answer scores 0 server-side
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
      sfx.unlock();
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
    sfx.unlock();
    setInput((v) => (v.length < 9 ? v + d : v));
  };
  const pressSign = () => {
    if (feedback || lockedRef.current) return;
    sfx.unlock();
    setInput((v) => (v.startsWith('-') ? v.slice(1) : '-' + v));
  };
  const pressBack = () => {
    if (feedback || lockedRef.current) return;
    setInput((v) => v.slice(0, -1));
  };
  const toggleMute = () => {
    sfx.unlock();
    setMuted(sfx.toggleMuted());
  };
  const canSubmit = input.trim() !== '' && input !== '-' && !feedback && !lockedRef.current;

  const urgent = timeFrac <= 0.3;
  const danger = timeFrac <= 0.15;
  const ringColor = danger ? DANGER : urgent ? AMBER : accent;
  const heartbeatDur = danger ? 0.4 + (timeFrac / 0.15) * 0.35 : undefined;

  if (!challenge) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  // Timer ring geometry.
  const R = 52;
  const CIRC = 2 * Math.PI * R;
  const dashOffset = CIRC * (1 - Math.max(0, Math.min(1, timeFrac)));

  const inputColor = feedback ? (feedback.correct ? GOLD : DANGER) : EMBER.textPrimary;
  const inputBorder = feedback
    ? feedback.correct
      ? 'rgba(255,201,63,0.65)'
      : 'rgba(255,77,94,0.65)'
    : 'rgba(240,176,90,0.35)';

  return (
    <div className={cn('relative flex flex-1 flex-col overflow-hidden', fx?.shake && 'animate-juice-shake')}>
      {/* Whole-screen feedback tint flash (opacity only, above content) */}
      {fx && (
        <div
          key={`flash-${fx.id}`}
          className={cn(
            'pointer-events-none absolute inset-0 z-20',
            fx.correct ? 'animate-juice-gold-flash' : 'animate-juice-red-flash',
          )}
          style={{
            background: fx.correct
              ? 'radial-gradient(circle at 50% 44%, rgba(255,201,63,0.34), transparent 70%)'
              : 'radial-gradient(circle at 50% 44%, rgba(255,77,94,0.40), transparent 72%)',
          }}
        />
      )}

      {/* Top bar — quit + progress + mute + score */}
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
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="flex h-9 w-9 items-center justify-center"
            style={{ color: EMBER.textTertiary }}
            aria-label={muted ? 'Unmute' : 'Mute'}
            aria-pressed={muted}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          {onValidate ? (
            <p
              className="font-display text-lg font-bold tabular-nums"
              style={{ color: accent, minWidth: '3ch', textAlign: 'right' }}
            >
              {displayScore.toLocaleString()}
            </p>
          ) : (
            <span className="w-9" />
          )}
        </div>
      </div>

      {/* Prompt + timer ring + input. min-h-0 lets this region actually shrink
          (and scroll internally on very short viewports) so the keypad+submit
          footer below is never pushed off-screen. */}
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center overflow-y-auto px-6">
        {/* Combo zone (solo only) — reserved height to avoid layout shift */}
        {onValidate && (
          <div className="relative mb-2 flex h-8 items-center justify-center">
            {combo >= 2 && (
              <span
                key={`combo-${combo}`}
                className="animate-juice-combo-pop font-display text-xl font-black inline-flex items-center gap-1"
              >
                <EmberFlame intensity={Math.min(combo / 8, 1)} size={22} />
                <span
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${GOLD}, ${DANGER})`,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  x{combo}
                </span>
              </span>
            )}
            {fx?.brokeComboFrom ? (
              <span
                key={`break-${fx.id}`}
                className="animate-juice-combo-shatter absolute font-display text-xl font-black inline-flex items-center gap-1"
                style={{ color: DANGER }}
              >
                {/* Guttering ember — cooling out as the combo breaks */}
                <EmberFlame intensity={0} size={22} />
                x{fx.brokeComboFrom}
              </span>
            ) : null}
          </div>
        )}

        {/* Timer ring wrapping the problem */}
        <div
          className={cn('relative h-64 w-64', danger && 'animate-juice-heartbeat')}
          style={heartbeatDur ? { animationDuration: `${heartbeatDur}s` } : undefined}
        >
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={ringColor}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              style={{
                transition: 'stroke 0.3s ease',
                filter: `drop-shadow(0 0 6px ${ringColor}66)`,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center px-8">
            <p
              className="font-display text-4xl font-bold tabular-nums sm:text-5xl"
              style={{ color: EMBER.textPrimary, textAlign: 'center' }}
            >
              {challenge.prompt.expression}
            </p>
          </div>
        </div>

        {/* Answer input — pops on correct, emits +N + particles */}
        <div className="relative mt-8">
          {/* Particle burst */}
          {fx && fx.particles > 0 && (
            <div
              key={`particles-${fx.id}`}
              className="pointer-events-none absolute left-1/2 top-1/2 z-10"
            >
              {Array.from({ length: fx.particles }).map((_, i) => (
                <span
                  key={i}
                  className="animate-juice-particle absolute block h-1.5 w-1.5 rounded-full"
                  style={
                    {
                      background: GOLD,
                      '--tx': `${PARTICLE_DIRS[i].tx}px`,
                      '--ty': `${PARTICLE_DIRS[i].ty}px`,
                      animationDelay: `${i * 8}ms`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          )}

          {/* +N floats up from the answer */}
          {fx?.correct && (
            <span className="pointer-events-none absolute -top-3 left-1/2 z-10 -translate-x-1/2">
              <span
                key={`plus-${fx.id}`}
                className="animate-juice-float-up block font-display text-2xl font-black tabular-nums"
                style={{ color: GOLD }}
              >
                +{fx.score}
              </span>
            </span>
          )}

          <div
            key={fx?.correct ? `pop-${fx.id}` : 'answer'}
            className={cn(
              'flex min-h-[3.5rem] min-w-[8rem] items-center justify-center border-b-2 px-4 text-4xl font-bold tabular-nums transition-colors',
              fx?.correct && 'animate-juice-pop',
            )}
            style={{ color: inputColor, borderColor: inputBorder }}
          >
            {input || <span style={{ color: EMBER.textTertiary }}>?</span>}
          </div>
        </div>

        {/* Feedback line — reserved height to avoid layout shift (solo only) */}
        <div className="mt-4 h-6">
          {feedback && !feedback.correct && (
            <p className="animate-slide-up font-display text-sm font-bold" style={{ color: DANGER }}>
              {fx?.timedOut ? 'Too slow!' : 'Missed'}
            </p>
          )}
        </div>
      </div>

      {/* Keypad + submit — a non-shrinking footer, always fully visible above
          the home indicator (safe-area padding); it can never be clipped. */}
      <div
        className="shrink-0 mx-auto w-full max-w-sm px-4 pt-1"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
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
          onClick={() => {
            haptics.confirm();
            void submit(input);
          }}
          disabled={!canSubmit || submitting}
          className="press-cta clip-card mt-2 flex h-14 w-full items-center justify-center font-display text-base font-bold text-white disabled:opacity-40"
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
      onClick={() => {
        if (disabled) return;
        haptics.tap();
        onClick();
      }}
      disabled={disabled}
      className="press-key clip-row flex h-14 items-center justify-center font-display text-2xl font-bold tabular-nums disabled:opacity-40"
      style={{ background: EMBER.surfaceRaised, color: EMBER.textPrimary }}
    >
      {children}
    </button>
  );
}
