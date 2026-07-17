import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, CalendarDays, X } from 'lucide-react';
import { useValidateAnswer } from '@/hooks/use-challenges';
import { useCompleteDaily, useDaily, useDailyLeaderboard } from '@/hooks/use-daily';
import type { DailyResult, DailyCompleteResponse, SoloXpSnapshot } from '@/hooks/use-daily';
import { ChallengePlayer } from '@/components/game/ChallengePlayer';
import { MemoryPlayer } from '@/components/game/MemoryPlayer';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ShareButton } from '@/components/share/ShareButton';
import { ResultCelebration, tierFromAccuracy } from '@/components/common/ResultCelebration';
import { XpLoader } from '@/components/common/XpLoader';
import { EMBER } from '@/lib/ember';
import type { Challenge } from '@/types/challenge.types';
import type { AsyncDuelAnswerInput } from '@/types/async-duel.types';

type Phase = 'intro' | 'playing' | 'results';

const ACCENT = EMBER.accent; // primary firelight orange — the daily is the hearth

export function DailyPage() {
  const navigate = useNavigate();
  const daily = useDaily();
  const validate = useValidateAnswer();
  const completeDaily = useCompleteDaily();

  const [phase, setPhase] = useState<Phase>('intro');
  // Snapshot of the freshly-scored run — shown on the results view after submit.
  const [justPlayed, setJustPlayed] = useState<DailyCompleteResponse | null>(null);

  const data = daily.data;

  const handleValidate = useCallback(
    async (challenge: Challenge, answer: string, elapsedMs: number) => {
      if (!data) throw new Error('no daily set');
      const result = await validate.mutateAsync({
        matchSeed: data.matchSeed,
        mode: data.mode,
        difficulty: data.difficulty,
        index: challenge.index,
        answer,
        elapsedMs,
      });
      return { correct: result.correct, score: result.score };
    },
    [data, validate],
  );

  // Memory-mode validation — same call, but the answer is the tapped tile
  // sequence (number[]) instead of a numeric string.
  const memoryValidate = useCallback(
    async (challenge: Challenge, answer: number[], elapsedMs: number) => {
      if (!data) throw new Error('no daily set');
      const result = await validate.mutateAsync({
        matchSeed: data.matchSeed,
        mode: data.mode,
        difficulty: data.difficulty,
        index: challenge.index,
        answer,
        elapsedMs,
      });
      return { correct: result.correct, score: result.score };
    },
    [data, validate],
  );

  const handleComplete = useCallback(
    (answers: AsyncDuelAnswerInput[]) => {
      completeDaily.mutate(
        { answers },
        {
          onSuccess: (res) => {
            setJustPlayed(res);
            setPhase('results');
          },
        },
      );
    },
    [completeDaily],
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (daily.isLoading || !data) {
    return (
      <div className="flex h-[100svh] items-center justify-center" style={{ background: EMBER.base }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // The result to render: a fresh submit wins, otherwise the server's stored one.
  const result: DailyResult | null =
    phase === 'results' ? justPlayed : data.alreadyPlayed ? data.result : null;

  // ── Results view (fresh submit OR already-played today) ──────────────────────
  if (result) {
    return (
      <DailyResultView
        result={result}
        progression={justPlayed?.progression ?? null}
        total={data.challenges.length}
        onDone={() => navigate('/')}
      />
    );
  }

  // ── Playing — pick the player for today's rotating mode ──────────────────────
  if (phase === 'playing') {
    return (
      <div className="flex h-[100svh] flex-col overflow-hidden" style={{ background: EMBER.base }}>
        {data.mode === 'memory' ? (
          <MemoryPlayer
            challenges={data.challenges}
            accent={ACCENT}
            onValidate={memoryValidate}
            onComplete={handleComplete}
            onQuit={() => navigate('/')}
            submitting={completeDaily.isPending}
          />
        ) : (
          <ChallengePlayer
            challenges={data.challenges}
            accent={ACCENT}
            onValidate={handleValidate}
            onComplete={handleComplete}
            onQuit={() => navigate('/')}
            submitting={completeDaily.isPending}
          />
        )}
      </div>
    );
  }

  // ── Intro / start screen ─────────────────────────────────────────────────────
  const isMemory = data.mode === 'memory';
  const introAccent = isMemory ? EMBER.mode.streak : ACCENT;
  const IntroIcon = isMemory ? Brain : CalendarDays;
  const introBlurb = isMemory
    ? 'Watch the lights, tap them back. One shot today.'
    : 'One shot. Everyone gets the same set today.';

  return (
    <div
      className="relative flex h-[100svh] flex-col items-center justify-center overflow-hidden px-6"
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
        style={{ width: 72, height: 72, background: 'rgba(232,137,59,0.13)' }}
      >
        <IntroIcon size={34} style={{ color: introAccent }} />
      </div>
      <h1 className="font-display text-2xl font-bold" style={{ color: EMBER.textPrimary }}>
        Arena Daily
      </h1>
      <p className="mt-2 max-w-xs text-center text-sm" style={{ color: EMBER.textSecondary }}>
        {introBlurb}
      </p>
      <button
        onClick={() => setPhase('playing')}
        className="press-cta clip-card mt-8 flex h-14 w-full max-w-xs items-center justify-center gap-2 font-display text-base font-bold text-white"
        style={{ background: 'linear-gradient(150deg, #E8893B, #C2541E)' }}
      >
        Start
      </button>
    </div>
  );
}

// ── Results view ───────────────────────────────────────────────────────────────

function DailyResultView({
  result,
  progression,
  total,
  onDone,
}: {
  result: DailyResult;
  progression: SoloXpSnapshot | null;
  total: number;
  onDone: () => void;
}) {
  const leaderboard = useDailyLeaderboard();
  const { score, correctCount, rank, totalPlayers, streak } = result;

  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const tier = tierFromAccuracy(accuracy);
  const streakLabel = `${streak}-day streak`;

  const topEntries = leaderboard.data?.entries.slice(0, 5) ?? [];

  return (
    <div className="h-[100svh] overflow-y-auto" style={{ background: EMBER.base }}>
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-8">
        <ResultCelebration tier={tier} className="mb-6" />
        {progression && (
          <XpLoader
            className="mb-6 w-full max-w-xs"
            level={progression.levelAfter}
            fromInto={progression.levelAfter > progression.levelBefore ? 0 : progression.intoLevelBefore}
            toInto={progression.intoLevelAfter}
            span={progression.levelSpanAfter}
            gained={progression.xpAwarded}
            leveledUp={progression.levelAfter > progression.levelBefore}
          />
        )}
        <p
          className="font-display text-xs font-semibold uppercase tracking-[0.12em]"
          style={{ color: EMBER.textTertiary }}
        >
          Daily done
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
              #{rank}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: EMBER.textTertiary }}>
              of {totalPlayers.toLocaleString()}
            </p>
          </div>
          <div className="clip-card flex-1 p-4 text-center" style={{ background: EMBER.surface }}>
            <p className="font-display text-2xl font-bold" style={{ color: EMBER.textPrimary }}>
              {streak}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: EMBER.textTertiary }}>
              Day streak
            </p>
          </div>
        </div>

        {/* Spoiler-free share card — score + streak, never the problems */}
        <div className="mt-8 w-full max-w-xs">
          <ShareButton
            preview
            fileName="arena-daily"
            label="Share result"
            shareText={`Arena Daily — I scored ${score.toLocaleString()} today. ${streakLabel}. Beat that.`}
            card={{
              variant: 'speed_math',
              outcome: 'solo',
              eyebrow: 'Arena Daily',
              kicker: 'I scored',
              headline: score.toLocaleString(),
              subhead: streakLabel,
              stats: [
                { label: 'Rank', value: `#${rank}` },
                { label: 'Streak', value: `${streak}d` },
              ],
              cta: 'Beat that.',
            }}
          />
        </div>

        {/* Today's top players (optional context) */}
        {topEntries.length > 0 && (
          <div className="mt-8 w-full max-w-xs">
            <p
              className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.1em]"
              style={{ color: EMBER.textTertiary }}
            >
              Today's top
            </p>
            <div className="clip-card overflow-hidden" style={{ background: EMBER.surface }}>
              {topEntries.map((e, i) => {
                const mine = leaderboard.data?.me?.rank === e.rank;
                return (
                  <div
                    key={e.rank}
                    className="flex items-center gap-3 px-4 py-2.5"
                    style={{
                      background: mine ? 'rgba(232,137,59,0.10)' : 'transparent',
                      borderTop: i === 0 ? undefined : `1px solid ${EMBER.hairline}`,
                    }}
                  >
                    <span
                      className="font-display text-sm font-bold tabular-nums"
                      style={{ width: 28, color: EMBER.textTertiary }}
                    >
                      {e.rank}
                    </span>
                    <span
                      className="flex-1 truncate text-sm font-medium"
                      style={{ color: EMBER.textPrimary }}
                    >
                      {e.username}
                    </span>
                    <span
                      className="font-display text-sm font-bold tabular-nums"
                      style={{ color: EMBER.accent }}
                    >
                      {e.score.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="mt-8 text-sm" style={{ color: EMBER.textTertiary }}>
          New challenge tomorrow
        </p>
        <button
          onClick={onDone}
          className="mt-3 text-sm font-medium"
          style={{ color: EMBER.textTertiary }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
