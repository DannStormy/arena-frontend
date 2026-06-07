import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { ARENA_CONFIG } from '@/lib/arena-config';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { LeaderboardEntry } from '@/types/leaderboard.types';
import type { TournamentArena } from '@/types/tournament.types';

const ARENAS = ['all', ...Object.keys(ARENA_CONFIG)] as const;
type ArenaFilter = (typeof ARENAS)[number];

const RANK_STYLES: Record<number, string> = {
  1: 'text-arena-gold font-bold',
  2: 'text-white/70 font-bold',
  3: 'text-orange-400 font-bold',
};

export function LeaderboardPage() {
  const [arena, setArena] = useState<ArenaFilter>('all');
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);

  const { data: entries, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: queryKeys.leaderboard.global(arena === 'all' ? undefined : arena),
    queryFn: async () => {
      const response = await api.get<LeaderboardEntry[]>('/leaderboard', {
        params: arena !== 'all' ? { arena } : undefined,
      });
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!token,
  });

  return (
    <div className="flex flex-col min-h-full bg-arena-bg">
      <PageHeader title="Leaderboard" />

      <p className="px-4 pb-3 text-white/40 text-xs">Ranked by total points scored</p>

      <Tabs
        value={arena}
        onValueChange={(v) => setArena(v as ArenaFilter)}
        className="flex-col"
      >
        {/* Fix 1 — horizontally scrollable tab bar */}
        <div className="overflow-x-auto px-4">
          <TabsList className="flex flex-nowrap justify-start bg-arena-surface border border-arena-border h-auto p-1 gap-1">
            <TabsTrigger
              value="all"
              className="text-xs shrink-0 text-white/70 data-[state=active]:bg-arena-gold data-[state=active]:text-black data-active:bg-arena-gold data-active:text-black"
            >
              🌍 All
            </TabsTrigger>

            {(Object.keys(ARENA_CONFIG) as TournamentArena[]).map((key) => (
              <TabsTrigger
                key={key}
                value={key}
                className="text-xs shrink-0 text-white/70 data-[state=active]:bg-arena-gold data-[state=active]:text-black data-active:bg-arena-gold data-active:text-black"
              >
                {ARENA_CONFIG[key].icon} {ARENA_CONFIG[key].label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={arena} className="px-4 mt-4">
          {isLoading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          )}

          {!isLoading && (!entries || entries.length === 0) && (
            <EmptyState title="No rankings yet" icon="🏆" />
          )}

          {!isLoading && entries && entries.length > 0 && (
            <div className="space-y-2 pb-4">
              {entries.map((entry, i) => {
                const rank = entry.rank ?? (i + 1);
                return (
                  <div
                    key={entry.userId}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3',
                      entry.userId === userId
                        ? 'bg-arena-gold/10 border-arena-gold/40'
                        : 'bg-arena-surface border-arena-border',
                    )}
                  >
                    {/* Fix 3 — prominent rank with gold/silver/bronze colours */}
                    <span
                      className={cn(
                        'w-8 text-center text-sm shrink-0',
                        RANK_STYLES[rank] ?? 'text-white/30 font-medium',
                      )}
                    >
                      #{rank}
                    </span>

                    <Avatar className="h-8 w-8">
                      <AvatarImage src={entry.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-arena-border text-white text-xs">
                        {entry.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {entry.username}
                        {entry.userId === userId && (
                          <span className="ml-1 text-arena-gold text-xs">(you)</span>
                        )}
                      </p>
                      <p className="text-white/40 text-xs">{entry.tournamentsPlayed} played</p>
                    </div>

                    {/* Fix 4 — total score, not prize money */}
                    <div className="text-right">
                      <p className="text-white font-semibold text-sm">
                        {(entry.totalScore ?? 0).toLocaleString()} pts
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
