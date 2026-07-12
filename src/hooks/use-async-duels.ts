import { useMutation, useQuery } from '@tanstack/react-query';
import type { Query } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/utils';
import type {
  AsyncDuelResult,
  AsyncDuelSetResponse,
  CreateAsyncDuelRequest,
  MatchmakeAsyncDuelRequest,
  SubmitAsyncDuelRequest,
} from '@/types/async-duel.types';

/** Create a challenge-a-friend match → returns a shareable code + the set. */
export function useCreateAsyncDuel() {
  return useMutation({
    mutationFn: (data: CreateAsyncDuelRequest) =>
      api.post<AsyncDuelSetResponse>('/async-duels', data).then((r) => r.data),
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to create challenge'));
    },
  });
}

/** Quick match against a stored ghost run → returns the same set shape. */
export function useMatchmakeAsyncDuel() {
  return useMutation({
    mutationFn: (data: MatchmakeAsyncDuelRequest) =>
      api.post<AsyncDuelSetResponse>('/async-duels/matchmake', data).then((r) => r.data),
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to find a match'));
    },
  });
}

/** Fetch the playable set for a match code (opponent score hidden until you finish). */
export function useAsyncDuelSet(code: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.asyncDuels.set(code ?? ''),
    queryFn: () =>
      api.get<AsyncDuelSetResponse>(`/async-duels/${code}`).then((r) => r.data),
    enabled: !!code && enabled,
    staleTime: 0,
  });
}

/** Submit a whole run; server validates every answer and resolves the match. */
export function useSubmitAsyncDuel() {
  return useMutation({
    mutationFn: ({ code, ...body }: SubmitAsyncDuelRequest & { code: string }) =>
      api.post<AsyncDuelResult>(`/async-duels/${code}/submit`, body).then((r) => r.data),
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to submit your run'));
    },
  });
}

interface UseAsyncDuelResultOptions {
  enabled?: boolean;
  /** Poll while waiting for the opponent to finish. Supports the function form
   *  so callers can key the interval off the current result status. */
  refetchInterval?:
    | number
    | false
    | ((query: Query<AsyncDuelResult, Error>) => number | false | undefined);
}

/** Final result (scores, winner, resolution, progression snapshots). */
export function useAsyncDuelResult(id: string | undefined, options?: UseAsyncDuelResultOptions) {
  return useQuery({
    queryKey: queryKeys.asyncDuels.result(id ?? ''),
    queryFn: () =>
      api.get<AsyncDuelResult>(`/async-duels/${id}/result`).then((r) => r.data),
    enabled: !!id && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval,
  });
}
