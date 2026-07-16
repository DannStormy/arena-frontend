import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Gauge } from 'lucide-react';
import { generateSet, validateLocal } from '@/lib/challenge-engine';
import { ChallengePlayer } from '@/components/game/ChallengePlayer';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ShareButton } from '@/components/share/ShareButton';
import { ResultCelebration, tierFromAccuracy } from '@/components/common/ResultCelebration';
import { useAuthStore } from '@/stores/auth.store';
import { EMBER } from '@/lib/ember';
import type { Challenge, ChallengeSetResponse } from '@/types/challenge.types';
import { HOOK_COPY } from '@/lib/hook-copy';

/**
 * PUBLIC viral-hook funnel — no signup, no auth, no backend. The whole thing
 * runs on the client challenge engine (generateSet / validateLocal), so a shared
 * `/c` link plays instantly for anyone, logged in or out.
 *
 * URL query contract:
 *   • seed — the challenge seed to replay (present on an INCOMING challenge).
 *   • s    — the challenger's score (present on an INCOMING challenge).
 *   • by   — the challenger's name (optional).
 * When seed + s are both present the run is framed head-to-head against the same
 * 10 questions; otherwise it's a fresh start on a new random seed.
 *
 * HONESTY: tiers are FIXED score-band labels describing the score itself — never
 * a percentile, ranking, or invented population stat.
 */

type Phase = 'intro' | 'playing' | 'results';

const ACCENT = EMBER.mode.blitz; // amber — the sprint burns hot/fast
const COUNT = 10;
const DIFFICULTY = 4;

// Honest score bands. Max is COUNT × 1000 = 10,000; a correct-but-slow answer
// floors at 400, so an all-correct run lands comfortably above these thresholds.
// Each label describes the SCORE, not a rank against anyone else.
// Tier labels + thresholds live in src/lib/hook-copy.ts (owner-editable).
function tierForScore(score: number): string {
  const tiers = HOOK_COPY.tiers;
  return (tiers.find((t) => score >= t.min) ?? tiers[tiers.length - 1]).label;
}

function freshSeed(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ChallengePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const username = useAuthStore((s) => s.user?.username);

  const seedParam = params.get('seed');
  const challengerScore = useMemo(() => {
    const raw = params.get('s');
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  }, [params]);
  const challengerName = useMemo(() => {
    const raw = params.get('by');
    const trimmed = raw?.trim();
    return trimmed ? trimmed.slice(0, 24) : null;
  }, [params]);

  const isIncoming = !!seedParam && challengerScore != null;

  const [phase, setPhase] = useState<Phase>('intro');
  const [set, setSet] = useState<ChallengeSetResponse | null>(null);
  const [playedSeed, setPlayedSeed] = useState('');
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // Live accumulators fed by ChallengePlayer's onValidate; snapshotted on complete.
  const scoreRef = useRef(0);
  const correctRef = useRef(0);

  // Build + start a run. Incoming challenges replay the challenger's exact seed
  // (identical questions → fair head-to-head); a fresh start rolls a new seed.
  const start = useCallback(
    (opts?: { forceFresh?: boolean }) => {
      const seed = !opts?.forceFresh && isIncoming && seedParam ? seedParam : freshSeed();
      const data = generateSet({
        matchSeed: seed,
        mode: 'speed_math',
        count: COUNT,
        difficulty: DIFFICULTY,
      });
      scoreRef.current = 0;
      correctRef.current = 0;
      setPlayedSeed(seed);
      setSet(data);
      setPhase('playing');
    },
    [isIncoming, seedParam],
  );

  const handleValidate = useCallback(
    async (challenge: Challenge, answer: string, elapsedMs: number) => {
      const result = validateLocal({
        matchSeed: playedSeed,
        mode: 'speed_math',
        difficulty: DIFFICULTY,
        index: challenge.index,
        answer,
        elapsedMs,
      });
      scoreRef.current += result.score;
      if (result.correct) correctRef.current += 1;
      return { correct: result.correct, score: result.score };
    },
    [playedSeed],
  );

  const handleComplete = useCallback(() => {
    setScore(scoreRef.current);
    setCorrectCount(correctRef.current);
    setPhase('results');
  }, []);

  const total = set?.challenges.length ?? 0;

  // ── Intro / hook screen ────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div
        className="relative flex h-[100dvh] flex-col items-center justify-center overflow-hidden px-6"
        style={{ background: EMBER.base }}
      >
        <div
          className="mb-6 flex items-center justify-center"
          style={{ width: 72, height: 72, background: 'rgba(240,176,90,0.13)' }}
        >
          <Gauge size={34} style={{ color: ACCENT }} />
        </div>

        <p
          className="font-display text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: EMBER.textTertiary }}
        >
          {isIncoming ? HOOK_COPY.intro.eyebrowIncoming : HOOK_COPY.intro.eyebrowFresh}
        </p>

        <h1
          className="mt-3 max-w-xs text-center font-display text-3xl font-bold leading-tight"
          style={{ color: EMBER.textPrimary }}
        >
          {HOOK_COPY.intro.headline}
        </h1>

        <p className="mt-3 max-w-xs text-center text-sm" style={{ color: EMBER.textSecondary }}>
          {isIncoming
            ? HOOK_COPY.intro.taunt(challengerName ?? HOOK_COPY.intro.someone, challengerScore!)
            : HOOK_COPY.intro.blurbFresh}
        </p>

        <button
          onClick={() => start()}
          className="press-cta clip-card mt-8 flex h-14 w-full max-w-xs items-center justify-center gap-2 font-display text-base font-bold text-white"
          style={{ background: 'linear-gradient(150deg, #F0B05A, #C2541E)' }}
        >
          {isIncoming ? HOOK_COPY.intro.startIncoming : HOOK_COPY.intro.startFresh}
        </button>

        <p className="mt-4 text-xs" style={{ color: EMBER.textTertiary }}>
          {HOOK_COPY.intro.footnote}
        </p>
      </div>
    );
  }

  // ── Results screen ──────────────────────────────────────────────────────────
  if (phase === 'results') {
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const tier = tierFromAccuracy(accuracy);
    const scoreTier = tierForScore(score);

    // Head-to-head verdict against the challenger (honest score comparison only).
    const outcome =
      isIncoming && challengerScore != null
        ? score > challengerScore
          ? 'win'
          : score < challengerScore
            ? 'loss'
            : 'tie'
        : null;
    const verdict =
      outcome === 'win'
        ? { label: HOOK_COPY.result.verdict.win, color: EMBER.win }
        : outcome === 'loss'
          ? { label: HOOK_COPY.result.verdict.loss, color: EMBER.lossInk }
          : outcome === 'tie'
            ? { label: HOOK_COPY.result.verdict.tie, color: EMBER.textSecondary }
            : null;

    // The share link replays the SAME seed this player just played, so the friend
    // gets the identical set. `by` = own username when logged in, else omitted.
    const shareParams = new URLSearchParams();
    shareParams.set('seed', playedSeed);
    shareParams.set('s', String(score));
    if (username) shareParams.set('by', username);
    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const shareLink = `${origin}/c?${shareParams.toString()}`;

    return (
      <div className="h-[100dvh] overflow-y-auto" style={{ background: EMBER.base }}>
        <div className="flex min-h-full flex-col items-center justify-center px-6 py-8">
          <ResultCelebration tier={tier} className="mb-6" />

          {verdict ? (
            <p
              className="font-display text-sm font-bold uppercase tracking-[0.14em]"
              style={{ color: verdict.color }}
            >
              {verdict.label}
            </p>
          ) : (
            <p
              className="font-display text-xs font-semibold uppercase tracking-[0.12em]"
              style={{ color: EMBER.textTertiary }}
            >
              {HOOK_COPY.result.yourScore}
            </p>
          )}

          <p className="mt-3 font-display text-6xl font-bold" style={{ color: EMBER.accentBright }}>
            {score.toLocaleString()}
          </p>

          {/* Honest tier chip — a fixed score-band label, not a ranking. */}
          <span
            className="clip-chip-sm mt-3 inline-flex items-center font-display text-xs font-bold uppercase tracking-[0.12em]"
            style={{
              padding: '6px 14px',
              color: ACCENT,
              background: 'rgba(240,176,90,0.13)',
              boxShadow: 'inset 0 0 0 1px rgba(240,176,90,0.35)',
            }}
          >
            {scoreTier}
          </span>

          {isIncoming && challengerScore != null && (
            <p className="mt-4 text-sm" style={{ color: EMBER.textSecondary }}>
              {HOOK_COPY.result.headToHead(
                score,
                challengerName ?? HOOK_COPY.result.challengerFallback,
                challengerScore,
              )}
            </p>
          )}

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

          {/* Challenge a friend — branded, spoiler-free card shared with the
              replay link (navigator.share → clipboard + toast fallback). */}
          <div className="mt-8 w-full max-w-xs">
            <ShareButton
              preview
              fileName="arena-challenge"
              label={HOOK_COPY.share.label}
              shareText={HOOK_COPY.share.text(score)}
              shareUrl={shareLink}
              card={{
                variant: 'speed_math',
                outcome: 'solo',
                eyebrow: HOOK_COPY.share.cardEyebrow,
                kicker: HOOK_COPY.share.cardKicker,
                headline: score.toLocaleString(),
                subhead: scoreTier,
                stats: [
                  { label: 'Correct', value: `${correctCount}/${total}` },
                  { label: 'Accuracy', value: `${accuracy}%` },
                ],
                cta: HOOK_COPY.share.cardCta,
              }}
            />
          </div>

          {/* Funnel CTA — save progress (register) or return to the app. */}
          <button
            onClick={() => navigate(isAuthenticated ? '/' : '/register')}
            className="press-cta clip-card mt-3 flex h-14 w-full max-w-xs items-center justify-center gap-2 font-display text-base font-bold text-white"
            style={{ background: 'linear-gradient(150deg, #E8893B, #C2541E)' }}
          >
            {isAuthenticated ? HOOK_COPY.result.ctaSaveAuthed : HOOK_COPY.result.ctaSaveGuest}
          </button>

          <button
            onClick={() => start({ forceFresh: true })}
            className="mt-3 text-sm font-medium"
            style={{ color: EMBER.textTertiary }}
          >
            {HOOK_COPY.result.playAgain}
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
        onQuit={() => setPhase('intro')}
      />
    </div>
  );
}
