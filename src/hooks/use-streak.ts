import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

// Daily-streak retention signal — GET /streak.
// The api instance already prefixes /api/v1 via VITE_API_BASE_URL, so paths are
// written relative (matches use-challenges / use-async-duels).
export interface StreakResponse {
  currentDailyStreak: number;
  longestDailyStreak: number;
  lastPlayedOn: string | null;
  playedToday: boolean;
  atRisk: boolean;
}

export function useStreak(): UseQueryResult<StreakResponse> {
  const token = useAuthStore((s) => s.token);
  return useQuery<StreakResponse>({
    queryKey: ['streak'],
    queryFn: () => api.get<StreakResponse>('/streak').then((r) => r.data),
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}
