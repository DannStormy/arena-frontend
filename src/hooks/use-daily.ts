import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import type { Challenge, ChallengeMode } from '@/types/challenge.types';
import type { AsyncDuelAnswerInput } from '@/types/async-duel.types';

// Arena Daily — one shared set per day, one shot, streak-driven retention loop.
// Mirrors the arena-api /daily contract. The api instance already prefixes
// /api/v1 via VITE_API_BASE_URL, so paths are written relative.

/** Today's result snapshot — returned inline on GET /daily (once played) and as
 *  the POST /daily/complete response body. */
export interface DailyResult {
  score: number;
  correctCount: number;
  rank: number;
  totalPlayers: number;
  streak: number;
}

/** GET /daily — the shared set plus whether this player has already had their shot. */
export interface DailyResponse {
  date: string;
  mode: ChallengeMode;
  difficulty: number;
  matchSeed: string;
  challenges: Challenge[];
  alreadyPlayed: boolean;
  result: DailyResult | null;
}

/** POST /daily/complete response — the scored run plus the played-flag. */
export interface DailyCompleteResponse extends DailyResult {
  alreadyPlayed: boolean;
}

export interface DailyLeaderboardEntry {
  rank: number;
  username: string;
  score: number;
}

/** GET /daily/leaderboard — today's top entries and the caller's own line. */
export interface DailyLeaderboardResponse {
  date: string;
  entries: DailyLeaderboardEntry[];
  me: { rank: number; score: number } | null;
}

/** Today's daily set + status. staleTime 0 so a return visit reflects a fresh
 *  played/unplayed state from the server. */
export function useDaily(): UseQueryResult<DailyResponse> {
  const token = useAuthStore((s) => s.token);
  return useQuery<DailyResponse>({
    queryKey: queryKeys.daily.today,
    queryFn: () => api.get<DailyResponse>('/daily').then((r) => r.data),
    enabled: !!token,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

/** Submit the whole run once. Server validates + scores authoritatively and
 *  returns rank/streak. Refreshes the daily + streak surfaces on success. */
export function useCompleteDaily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { answers: AsyncDuelAnswerInput[] }) =>
      api.post<DailyCompleteResponse>('/daily/complete', body).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.daily.all });
      void queryClient.invalidateQueries({ queryKey: ['streak'] });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to submit your run'));
    },
  });
}

/** Today's daily leaderboard (top entries + the caller's own line). */
export function useDailyLeaderboard(enabled = true): UseQueryResult<DailyLeaderboardResponse> {
  const token = useAuthStore((s) => s.token);
  return useQuery<DailyLeaderboardResponse>({
    queryKey: queryKeys.daily.leaderboard,
    queryFn: () => api.get<DailyLeaderboardResponse>('/daily/leaderboard').then((r) => r.data),
    enabled: !!token && enabled,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  });
}
