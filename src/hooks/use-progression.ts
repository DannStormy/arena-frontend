import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

/** The slice of GET /progression/me the results XP bar needs (level projection). */
export interface MyProgression {
  level: {
    number: number;
    xp: number;
    intoLevel: number;
    xpToNext: number | null;
    milestonesUnlocked: number[];
  };
}

/** Current user's progression. Used by solo results to fill the XP bar. */
export function useMyProgression(enabled = true) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['progression', 'me'],
    queryFn: () => api.get<MyProgression>('/progression/me').then((r) => r.data),
    enabled: enabled && !!token,
    staleTime: 0,
  });
}
