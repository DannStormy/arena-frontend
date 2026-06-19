// NOTE(data): This page currently reads the tournament leaderboard endpoint
// (/leaderboard). The duel-rank leaderboard requires a separate backend endpoint
// (e.g. /progression/leaderboard). When that ships, swap the queryFn URL and
// update the score field name — UI and TierBadge derivation stay the same.
// TierBadge tier is derived from totalScore using duel-rank thresholds for now;
// the visual hierarchy is correct once real duel-rank points are in the response.

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { ARENA_CONFIG } from '@/lib/arena-config';
import { EMBER } from '@/lib/ember';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { TierBadge } from '@/components/common/TierBadge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { LeaderboardEntry } from '@/types/leaderboard.types';
import type { TournamentArena } from '@/types/tournament.types';

const ARENAS = ['all', ...Object.keys(ARENA_CONFIG)] as const;
type ArenaFilter = (typeof ARENAS)[number];

const PODIUM_COLORS: Record<number, string> = {
  1: '#F5A623',
  2: 'rgba(255,255,255,0.40)',
  3: '#C9774A',
};

function EntryRow({ entry, rank, isMe }: { entry: LeaderboardEntry; rank: number; isMe: boolean }) {
  const isPodium = rank <= 3;
  const rankColor = PODIUM_COLORS[rank];
  const leftBarColor = isMe
    ? EMBER.accent
    : rankColor ?? 'transparent';

  return (
    <div
      className="relative clip-row overflow-hidden flex items-center gap-3"
      style={{
        minHeight: 48,
        background: isMe ? 'rgba(232,137,59,0.10)' : EMBER.surface,
        paddingLeft: 16,
        paddingRight: 12,
        paddingTop: 10,
        paddingBottom: 10,
      }}
    >
      {/* Left accent bar */}
      {(isMe || isPodium) && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ background: leftBarColor }}
        />
      )}

      {/* Rank number — fixed 24px slot */}
      <span
        className="font-display font-bold tabular-nums shrink-0 text-center"
        style={{
          width: 24,
          fontSize: isPodium ? 14 : 12,
          color: rankColor ?? EMBER.textTertiary,
        }}
      >
        {rank}
      </span>

      {/* Avatar */}
      <div
        className="clip-avatar flex items-center justify-center shrink-0 font-bold text-xs text-white select-none"
        style={{
          width: isPodium ? 36 : 32,
          height: isPodium ? 36 : 32,
          background: isMe
            ? 'linear-gradient(150deg, #E8893B, #C2541E)'
            : 'rgba(255,255,255,0.06)',
        }}
      >
        {entry.username.slice(0, 2).toUpperCase()}
      </div>

      {/* Name + YOU tag */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p
            className="text-sm font-semibold truncate"
            style={{ color: isMe ? EMBER.accent : EMBER.textPrimary }}
          >
            {entry.username}
          </p>
          {isMe && (
            <span
              className="text-[9px] font-bold shrink-0 font-display"
              style={{ color: EMBER.accent, opacity: 0.65 }}
            >
              YOU
            </span>
          )}
        </div>
        <p className="text-[11px]" style={{ color: EMBER.textTertiary }}>
          {entry.tournamentsPlayed} played
        </p>
      </div>

      {/* Fixed right section: TierBadge | score — both in fixed columns for alignment */}
      <div
        className="grid shrink-0 items-center"
        style={{ gridTemplateColumns: '40px 64px', columnGap: 8 }}
      >
        <div className="flex justify-center">
          <TierBadge tier={entry.totalScore ?? 0} size="sm" />
        </div>
        <p
          className="font-display font-bold tabular-nums text-right text-sm"
          style={{ color: isMe ? EMBER.accent : EMBER.textPrimary }}
        >
          {(entry.totalScore ?? 0).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export function LeaderboardPage() {
  const [arena, setArena] = useState<ArenaFilter>('all');
  const token  = useAuthStore((s) => s.token);
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
    <div className="flex flex-col min-h-full" style={{ background: EMBER.base }}>
      <PageHeader title="Leaderboard" />

      <Tabs
        value={arena}
        onValueChange={(v) => setArena(v as ArenaFilter)}
        className="flex-col"
      >
        <div className="overflow-x-auto px-4 pb-1">
          <TabsList
            className="flex flex-nowrap justify-start h-auto p-1 gap-1"
            style={{
              background: EMBER.surface,
              border: `1px solid ${EMBER.border}`,
              borderRadius: 0,
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
            }}
          >
            <TabsTrigger
              value="all"
              className="text-xs shrink-0 rounded-none data-active:text-white"
              style={{}}
            >
              All arenas
            </TabsTrigger>
            {(Object.keys(ARENA_CONFIG) as TournamentArena[]).map((key) => (
              <TabsTrigger
                key={key}
                value={key}
                className="text-xs shrink-0 rounded-none data-active:text-white"
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
              <p
                className="font-display font-bold text-lg"
                style={{ color: EMBER.textPrimary }}
              >
                No competitors yet
              </p>
              <p className="text-sm max-w-[240px]" style={{ color: EMBER.textTertiary }}>
                Play a duel to claim the top spot and start your legacy
              </p>
            </div>
          )}

          {!isLoading && entries && entries.length > 0 && (
            <div className="space-y-1.5 pb-4">
              {entries.map((entry, i) => {
                const rank = entry.rank ?? (i + 1);
                const isMe = entry.userId === userId;
                return (
                  <EntryRow key={entry.userId} entry={entry} rank={rank} isMe={isMe} />
                );
              })}

              {!isInList && (
                <div
                  className="pt-3 mt-1 text-center"
                  style={{ borderTop: `1px solid ${EMBER.border}` }}
                >
                  <p className="text-xs" style={{ color: EMBER.textTertiary }}>
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
