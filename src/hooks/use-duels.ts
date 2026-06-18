import { useQuery, useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth.store';
import { getErrorMessage } from '@/lib/utils';
import type { Duel, DuelHistoryItem, DuelMode } from '@/types/duel.types';
import type { TournamentArena, PaginatedResponse } from '@/types/tournament.types';

interface CreateDuelData {
  mode: DuelMode;
  arena: TournamentArena;
  stake: number;
}

export function useCreateDuel() {
  return useMutation({
    mutationFn: (data: CreateDuelData) =>
      api.post<Duel>('/duels', data).then((r) => r.data),
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to create duel'));
    },
  });
}

export function useAcceptDuel() {
  return useMutation({
    mutationFn: (code: string) =>
      api.post<Duel>(`/duels/${code}/accept`).then((r) => r.data),
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to accept duel'));
    },
  });
}

export function useMatchmake() {
  return useMutation({
    mutationFn: (data: CreateDuelData) =>
      api.post<Duel>('/duels/matchmake', data).then((r) => r.data),
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to find opponent'));
    },
  });
}

export function useDuel(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.duels.detail(id ?? ''),
    queryFn: () => api.get<Duel>(`/duels/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

interface UseDuelByCodeOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

export function useDuelByCode(code: string, options?: UseDuelByCodeOptions) {
  return useQuery({
    queryKey: queryKeys.duels.byCode(code),
    queryFn: () => api.get<Duel>(`/duels/code/${code}`).then((r) => r.data),
    enabled: !!code && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval,
  });
}

export function useDuelHistory() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.duels.history,
    queryFn: () => api.get<PaginatedResponse<DuelHistoryItem>>('/duels/history').then((r) => r.data),
    enabled: !!token,
  });
}

export function useDuelHistoryInfinite() {
  const token = useAuthStore((s) => s.token);
  return useInfiniteQuery({
    queryKey: queryKeys.duels.historyInfinite,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      api
        .get<PaginatedResponse<DuelHistoryItem>>(`/duels/history?page=${pageParam}&limit=20`)
        .then((r) => r.data),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: !!token,
    // Prevent staleTime:0 default from re-fetching page 1 on every Strict Mode
    // double-mount and window-focus event during a session.
    staleTime: 2 * 60 * 1000,
  });
}
