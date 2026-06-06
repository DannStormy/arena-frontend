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
import type { LeaderboardResponse } from '@/types/leaderboard.types';
import type { TournamentArena } from '@/types/tournament.types';

const ARENAS = ['all', ...Object.keys(ARENA_CONFIG)] as const;
type ArenaFilter = (typeof ARENAS)[number];

export function LeaderboardPage() {
  const [arena, setArena] = useState<ArenaFilter>('all');
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.leaderboard.global(arena === 'all' ? undefined : arena),
    queryFn: async () => {
      const response = await api.get<LeaderboardResponse>('/leaderboard', {
        params: arena !== 'all' ? { arena } : undefined,
      });
      return response.data;
    },
    enabled: !!token,
  });

  return (
    <div className="flex flex-col min-h-full bg-arena-bg">
      <PageHeader title="Leaderboard" />

      <Tabs
        value={arena}
        onValueChange={(v) => setArena(v as ArenaFilter)}
        className="px-4"
      >
        <TabsList className="w-full overflow-x-auto flex-nowrap justify-start bg-arena-surface border border-arena-border h-auto p-1 gap-1">
          <TabsTrigger
            value="all"
            className="text-xs shrink-0 data-[state=active]:bg-arena-gold data-[state=active]:text-black"
          >
            🌍 All
          </TabsTrigger>

          {(Object.keys(ARENA_CONFIG) as TournamentArena[]).map((key) => (
            <TabsTrigger
              key={key}
              value={key}
              className="text-xs shrink-0 data-[state=active]:bg-arena-gold data-[state=active]:text-black"
            >
              {ARENA_CONFIG[key].icon}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={arena} className="mt-4">
          {isLoading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          )}

          {!isLoading && (!data?.entries || data.entries.length === 0) && (
            <EmptyState title="No rankings yet" icon="🏆" />
          )}

          {!isLoading && data?.entries && data.entries.length > 0 && (
            <div className="space-y-2 pb-4">
              {data.entries.map((entry) => (
                <div
                  key={entry.userId}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3',
                    entry.userId === userId
                      ? 'bg-arena-gold/10 border-arena-gold/40'
                      : 'bg-arena-surface border-arena-border',
                  )}
                >
                  <span className="w-7 text-center text-sm font-bold text-white/40">
                    {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
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
                    <p className="text-white/40 text-xs">{entry.tournamentsWon} wins</p>
                  </div>

                  <div className="text-right">
                    <p className="text-white font-semibold text-sm">{entry.totalScore.toLocaleString()}</p>
                    <p className="text-arena-gold text-xs">₦{Number(entry.totalEarnings).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
