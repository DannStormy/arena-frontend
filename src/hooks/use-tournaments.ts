import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth.store';
import type {
  PaginatedResponse,
  Tournament,
  TournamentEntry
} from '@/types/tournament.types';

export function useTournaments(filters?: Record<string, unknown>) {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: queryKeys.tournaments.list(filters),
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Tournament>>(
        '/tournaments',
        { params: filters }
      );
      return response.data;
    },
    enabled: !!token
  });
}

export function useTournament(id: string) {
  return useQuery({
    queryKey: queryKeys.tournaments.detail(id),
    queryFn: async () => {
      const response = await api.get<Tournament>(`/tournaments/${id}`);
      return response.data;
    },
    enabled: !!id
  });
}

export function useTournamentLeaderboard(id: string) {
  return useQuery({
    queryKey: queryKeys.tournaments.leaderboard(id),
    queryFn: async () => {
      const response = await api.get<TournamentEntry[]>(
        `/tournaments/${id}/leaderboard`
      );
      return response.data;
    },
    enabled: !!id
  });
}

export function useJoinTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tournamentId: string) => {
      const response = await api.post<{ sessionId: string }>(
        `/tournaments/${tournamentId}/join`
      );
      return response.data;
    },
    onSuccess: (_data, tournamentId) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tournaments.detail(tournamentId)
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tournaments.all
      });
    }
  });
}
