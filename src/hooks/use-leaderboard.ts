// Leaderboard data hooks.
//
// The all-time XP/level board (GET /leaderboard/level) is the real, populated
// board: every mode that awards level-XP feeds it, so anyone who plays climbs.
// The season DUEL-rank board (GET /leaderboard/duels) only moves on real-time
// duels and is empty until there are live opponents — the page keeps it behind
// a secondary tab.

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth.store';
import type { LevelLeaderboardEntry } from '@/types/leaderboard.types';
import type { PaginatedResponse } from '@/types/tournament.types';

/**
 * All-time XP/level leaderboard, paginated. Returns the full
 * PaginatedResponse so callers can read totals + the BE-appended own-row.
 */
export function useLevelLeaderboard(page = 1, limit = 20) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.leaderboard.level(page, limit),
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<LevelLeaderboardEntry>>(
        `/leaderboard/level?page=${page}&limit=${limit}`,
      );
      return res.data;
    },
    enabled: !!token,
    placeholderData: keepPreviousData,
  });
}
