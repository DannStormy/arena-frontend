import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { ARENA_CONFIG } from '@/lib/arena-config';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { RankBadge } from '@/components/common/RankBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { LeaderboardEntry } from '@/types/leaderboard.types';
import type { TournamentArena } from '@/types/tournament.types';

const ARENAS = ['all', ...Object.keys(ARENA_CONFIG)] as const;
type ArenaFilter = (typeof ARENAS)[number];

const PODIUM_RANK: Record<number, { numColor: string; borderLeft: string; borderGlow: string }> = {
  1: { numColor: '#F5A623',                 borderLeft: '#F5A623',                  borderGlow: '2px 0 10px rgba(245,166,35,0.4)'  },
  2: { numColor: 'rgba(255,255,255,0.55)',  borderLeft: 'rgba(255,255,255,0.2)',     borderGlow: 'none'                             },
  3: { numColor: '#C9774A',                 borderLeft: 'rgba(201,119,74,0.55)',     borderGlow: '2px 0 8px rgba(201,119,74,0.3)'   },
};

function EntryRow({ entry, rank, isMe }: { entry: LeaderboardEntry; rank: number; isMe: boolean }) {
  const podium = PODIUM_RANK[rank];
  const isPodium = rank <= 3;

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 rounded-xl border overflow-hidden',
        isPodium ? 'p-4' : 'p-3',
        isMe ? 'bg-arena-purple/10 border-arena-purple/35' : 'bg-arena-surface border-arena-border',
      )}
    >
      {/* Left accent: podium gets tier color, own row gets brand purple */}
      {(isPodium || isMe) && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{
            background: isMe ? '#7C5CFF' : (podium?.borderLeft ?? 'transparent'),
            boxShadow:  isMe ? '2px 0 10px rgba(124,92,255,0.4)' : (podium?.borderGlow ?? 'none'),
          }}
        />
      )}

      {/* Rank number */}
      <span
        className={cn(
          'w-7 text-center shrink-0 tabular-nums font-display',
          isPodium ? 'text-base font-bold' : 'text-sm font-medium',
        )}
        style={{ color: podium?.numColor ?? '#76767F' }}
      >
        {rank}
      </span>

      {/* Avatar */}
      <Avatar className={isPodium ? 'h-9 w-9' : 'h-8 w-8'}>
        <AvatarImage src={entry.avatarUrl ?? undefined} />
        <AvatarFallback
          className="text-xs font-bold text-white"
          style={{ background: isMe ? '#7C5CFF' : '#26262F' }}
        >
          {entry.username.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Name + subtitle */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={cn('text-sm font-semibold truncate', isMe ? 'text-arena-purple-bright' : 'text-arena-text-primary')}>
            {entry.username}
          </p>
          {isMe && (
            <span className="text-[9px] font-bold text-arena-purple-bright/60 shrink-0 font-display">
              YOU
            </span>
          )}
        </div>
        <p className="text-arena-text-tertiary text-[11px]">{entry.tournamentsPlayed} played</p>
      </div>

      {/* Score + tier badge */}
      <div className="flex flex-col items-end gap-1.5">
        <p className={cn('font-display font-bold tabular-nums', isPodium ? 'text-base' : 'text-sm', isMe ? 'text-arena-purple-bright' : 'text-arena-text-primary')}>
          {(entry.totalScore ?? 0).toLocaleString()}
        </p>
        <RankBadge score={entry.totalScore ?? 0} size="xs" />
      </div>
    </div>
  );
}

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

  const isInList = entries?.some((e) => e.userId === userId) ?? false;

  return (
    <div className="flex flex-col min-h-full bg-arena-bg">
      <PageHeader title="Leaderboard" />

      <Tabs
        value={arena}
        onValueChange={(v) => setArena(v as ArenaFilter)}
        className="flex-col"
      >
        <div className="overflow-x-auto px-4 pb-1">
          <TabsList className="flex flex-nowrap justify-start bg-arena-surface border border-arena-border h-auto p-1 gap-1 rounded-xl">
            <TabsTrigger
              value="all"
              className="text-xs shrink-0 text-arena-text-tertiary rounded-lg data-active:bg-arena-purple data-active:text-white"
            >
              All arenas
            </TabsTrigger>
            {(Object.keys(ARENA_CONFIG) as TournamentArena[]).map((key) => (
              <TabsTrigger
                key={key}
                value={key}
                className="text-xs shrink-0 text-arena-text-tertiary rounded-lg data-active:bg-arena-purple data-active:text-white"
              >
                {ARENA_CONFIG[key].label}
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
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <p className="font-display text-arena-text-primary font-bold text-lg">
                No competitors yet
              </p>
              <p className="text-arena-text-tertiary text-sm max-w-[240px]">
                Play a duel to claim the top spot and start your legacy
              </p>
            </div>
          )}

          {!isLoading && entries && entries.length > 0 && (
            <div className="space-y-2 pb-4">
              {entries.map((entry, i) => {
                const rank = entry.rank ?? (i + 1);
                const isMe = entry.userId === userId;
                return (
                  <EntryRow key={entry.userId} entry={entry} rank={rank} isMe={isMe} />
                );
              })}

              {!isInList && (
                <div className="pt-3 mt-1 border-t border-arena-border/40 text-center">
                  <p className="text-arena-text-tertiary text-xs">
                    You're not on the board yet — play a duel to climb
                  </p>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
