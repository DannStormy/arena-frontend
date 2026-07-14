import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Swords } from 'lucide-react';
import { useAsyncDuelSet, useSubmitAsyncDuel } from '@/hooks/use-async-duels';
import { useAuthStore } from '@/stores/auth.store';
import { ChallengePlayer } from '@/components/game/ChallengePlayer';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EMBER, getEmberModeAccent } from '@/lib/ember';
import type { AsyncDuelAnswerInput, AsyncDuelSetResponse } from '@/types/async-duel.types';

interface PlayState {
  set?: AsyncDuelSetResponse;
  isCreator?: boolean;
}

/**
 * Play a match set: challenge-link (friend side), the creator's own first run,
 * or a ghost quick-match. Loads the set from router state when available (to
 * avoid a redundant fetch right after create/matchmake) and falls back to
 * GET /async-duels/:code otherwise. Submits the whole run and routes to the
 * result/share screen.
 */
export function AsyncDuelPlayPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as PlayState | null) ?? {};

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrating = useAuthStore((s) => s.isHydrating);

  // A shared link may be opened logged-out — route through auth and back.
  useEffect(() => {
    if (!isHydrating && !isAuthenticated) {
      const back = `/async/${code}`;
      navigate(`/login?redirect=${encodeURIComponent(back)}`, { replace: true });
    }
  }, [isHydrating, isAuthenticated, code, navigate]);

  // Only fetch if we weren't handed the set on navigation.
  const hasStateSet = !!state.set;
  const query = useAsyncDuelSet(code, isAuthenticated && !hasStateSet);
  const set = state.set ?? query.data;

  const submit = useSubmitAsyncDuel();
  const submittedRef = useRef(false);

  const goToResult = useCallback(
    (id: string) => navigate(`/async/${id}/result`, { replace: true }),
    [navigate],
  );

  // If the requester already finished this match, skip straight to the result.
  useEffect(() => {
    if (set?.alreadyCompleted && set.id) goToResult(set.id);
  }, [set?.alreadyCompleted, set?.id, goToResult]);

  const handleComplete = useCallback(
    (answers: AsyncDuelAnswerInput[]) => {
      if (!code || submittedRef.current) return;
      submittedRef.current = true;
      submit.mutate(
        { code, answers },
        {
          onSuccess: (result) => goToResult(result.id),
          onError: () => {
            submittedRef.current = false;
          },
        },
      );
    },
    [code, submit, goToResult],
  );

  if (isHydrating || !isAuthenticated) {
    return <FullScreenSpinner />;
  }

  if (query.isError) {
    return (
      <div
        className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center"
        style={{ background: EMBER.base }}
      >
        <Swords size={40} style={{ color: EMBER.textTertiary }} />
        <p className="font-display text-xl font-bold" style={{ color: EMBER.textPrimary }}>
          Challenge not found
        </p>
        <p className="text-sm" style={{ color: EMBER.textSecondary }}>
          This link may have expired or the match no longer exists.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-2 text-sm font-medium"
          style={{ color: EMBER.accent }}
        >
          Go to Arena
        </button>
      </div>
    );
  }

  if (!set || submit.isPending) {
    return <FullScreenSpinner label={submit.isPending ? 'Submitting your run…' : undefined} />;
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden" style={{ background: EMBER.base }}>
      <ChallengePlayer
        challenges={set.challenges}
        accent={getEmberModeAccent(set.mode)}
        onComplete={handleComplete}
        onQuit={() => navigate('/')}
        submitting={submit.isPending}
      />
    </div>
  );
}

function FullScreenSpinner({ label }: { label?: string }) {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center gap-4"
      style={{ background: EMBER.base }}
    >
      <LoadingSpinner size="lg" />
      {label && (
        <p className="text-sm" style={{ color: EMBER.textSecondary }}>
          {label}
        </p>
      )}
    </div>
  );
}
