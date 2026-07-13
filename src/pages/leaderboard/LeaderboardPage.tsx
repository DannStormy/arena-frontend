// NOTE(data): Reads the duel-rank leaderboard endpoint — GET /leaderboard/duels.
// This is a GLOBAL per-season duel-rank ledger: there are no per-arena projections,
// so this board shows no arena selector (the endpoint's `arena` param doesn't filter).
// `tier` comes straight from the BE row (real duel rank) — no score-derived stopgap.

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { EMBER } from '@/lib/ember';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  TierBadge,
  TIER_THRESHOLDS,
  normalizeTierName,
  getTierDisplayName,
} from '@/components/common/TierBadge';
import type { LeaderboardEntry } from '@/types/leaderboard.types';
import type { PaginatedResponse } from '@/types/tournament.types';

// ── Podium styling ───────────────────────────────────────────────────────────

const PODIUM: Record<number, { numColor: string; barColor: string; barGlow: string }> = {
  1: {
    numColor: '#F5A623',
    barColor: '#F5A623',
    barGlow: '2px 0 10px rgba(245,166,35,0.50)',
  },
  2: {
    numColor: 'rgba(255,255,255,0.50)',
    barColor: 'rgba(255,255,255,0.28)',
    barGlow: 'none',
  },
  3: {
    numColor: '#C9774A',
    barColor: '#C9774A',
    barGlow: '2px 0 8px rgba(201,119,74,0.40)',
  },
};

// ── Entry row ────────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  rank,
  isMe,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isMe: boolean;
}) {
  const isPodium  = rank <= 3;
  const podium    = PODIUM[rank];
  const rankColor = podium?.numColor ?? EMBER.textTertiary;

  const leftBarColor = isMe ? EMBER.accent : (podium?.barColor ?? 'transparent');
  const leftBarGlow  = isMe
    ? '2px 0 10px rgba(232,137,59,0.55)'
    : (podium?.barGlow ?? 'none');

  return (
    <div
      className="relative clip-row overflow-hidden"
      style={{
        minHeight: isPodium ? 52 : 46,
        background: isMe ? 'rgba(232,137,59,0.10)' : EMBER.surface,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        paddingLeft: 16,
        paddingRight: 12,
        paddingTop: isPodium ? 10 : 8,
        paddingBottom: isPodium ? 10 : 8,
      }}
    >
      {/* Left accent bar — podium or own-row glow */}
      {(isMe || isPodium) && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ background: leftBarColor, boxShadow: leftBarGlow }}
        />
      )}

      {/* Rank number — fixed 28px slot */}
      <span
        className="font-display font-bold tabular-nums shrink-0 text-center"
        style={{
          width: 28,
          fontSize: isPodium ? 15 : 12,
          color: rankColor,
        }}
      >
        {rank}
      </span>

      {/* Avatar — clipped, ember gradient for own row */}
      <div
        className="clip-avatar flex items-center justify-center shrink-0 font-bold text-xs text-white select-none"
        style={{
          width: isPodium ? 36 : 30,
          height: isPodium ? 36 : 30,
          background: isMe
            ? 'linear-gradient(150deg, #E8893B, #C2541E)'
            : 'rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}
      >
        {entry.username.slice(0, 2).toUpperCase()}
      </div>

      {/* Name + subtitle */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p
            className="font-semibold truncate"
            style={{
              fontSize: isPodium ? 13 : 12,
              color: isMe ? EMBER.accent : EMBER.textPrimary,
            }}
          >
            {entry.username}
          </p>
          {isMe && (
            <span
              className="clip-chip-sm font-display font-bold shrink-0 px-1 py-px"
              style={{
                fontSize: 8,
                letterSpacing: '0.10em',
                background: 'rgba(232,137,59,0.18)',
                color: EMBER.accent,
              }}
            >
              YOU
            </span>
          )}
        </div>
        <p style={{ fontSize: 10, color: EMBER.textTertiary, marginTop: 1 }}>
          {entry.gamesPlayed} played
        </p>
      </div>

      {/* Fixed right section: TierBadge sm | rank points */}
      <div
        className="grid shrink-0 items-center"
        style={{ gridTemplateColumns: '36px 60px', columnGap: 8 }}
      >
        <div className="flex justify-center">
          <TierBadge tier={entry.tier} size="sm" />
        </div>
        <p
          className="font-display font-bold tabular-nums text-right"
          style={{
            fontSize: isPodium ? 14 : 12,
            color: isMe ? EMBER.accent : EMBER.textPrimary,
          }}
        >
          {(entry.rankPoints ?? 0).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

// ── Tier ladder ─────────────────────────────────────────────────────────────
// Shown when the board is empty or sparse — gives the player something
// aspirational to look at rather than a black void.

function TierLadder({ myTierName }: { myTierName?: string }) {
  const myTier = myTierName != null ? normalizeTierName(myTierName) : null;

  return (
    <div className="clip-card overflow-hidden" style={{ background: EMBER.surface }}>
      {/* Bracket-tick accent at top-left */}
      <div className="p-4">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-4"
          style={{ color: EMBER.textTertiary }}
        >
          The ladder
        </p>
        <div className="space-y-3">
          {TIER_THRESHOLDS.map(({ name, minScore }) => {
            const isCurrentTier = myTier === name;
            return (
              <div key={name} className="flex items-center gap-3">
                <TierBadge tier={name} size="sm" />
                <p
                  className="flex-1 font-semibold min-w-0 truncate"
                  style={{
                    fontSize: 12,
                    color: isCurrentTier ? EMBER.accent : EMBER.textPrimary,
                  }}
                >
                  {getTierDisplayName(name)}
                </p>
                <p
                  className="font-display tabular-nums shrink-0"
                  style={{ fontSize: 11, color: EMBER.textTertiary }}
                >
                  {minScore === 0 ? '0+' : `${minScore.toLocaleString()}+`}
                </p>
                {isCurrentTier && (
                  <span
                    className="clip-chip-sm font-display font-bold shrink-0 px-1.5 py-px"
                    style={{
                      fontSize: 8,
                      letterSpacing: '0.10em',
                      background: 'rgba(232,137,59,0.18)',
                      color: EMBER.accent,
                    }}
                  >
                    YOU
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function LeaderboardPage() {
  const token  = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);

  // Duel rank is a GLOBAL per-season ledger — no per-arena filtering.
  const { data: entries, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: queryKeys.leaderboard.global(),
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<LeaderboardEntry>>('/leaderboard/duels');
      return Array.isArray(response.data?.data) ? response.data.data : [];
    },
    enabled: !!token,
  });

  const isInList = entries?.some((e) => e.userId === userId) ?? false;
  const myEntry  = entries?.find((e) => e.userId === userId);
  const isSparse = (entries?.length ?? 0) <= 3;

  return (
    <div className="flex flex-col min-h-full" style={{ background: EMBER.base }}>
      <PageHeader title="Leaderboard" />

      {/* No arena selector — duel rank is a global per-season ledger, not per-arena. */}

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 pb-6">
        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {/* Empty state — framed, with tier ladder so the screen has purpose */}
        {!isLoading && (!entries || entries.length === 0) && (
          <div className="space-y-4 pt-2">
            <div
              className="clip-card p-5 text-center"
              style={{ background: EMBER.surface }}
            >
              <p
                className="font-display font-bold text-lg mb-1"
                style={{ color: EMBER.textPrimary }}
              >
                First blood — no competitors yet
              </p>
              <p className="text-sm" style={{ color: EMBER.textTertiary }}>
                Play a duel to claim your spot on the board
              </p>
            </div>
            <TierLadder myTierName={myEntry?.tier} />
          </div>
        )}

        {/* Populated list */}
        {!isLoading && entries && entries.length > 0 && (
          <div className="space-y-4 pt-2">
            {/* Rows */}
            <div className="space-y-1.5">
              {entries.map((entry, i) => {
                const rank = entry.rank ?? (i + 1);
                const isMe = entry.userId === userId;
                return (
                  <EntryRow key={entry.userId} entry={entry} rank={rank} isMe={isMe} />
                );
              })}

              {/* Not-in-list footer */}
              {!isInList && (
                <div
                  className="pt-3 text-center"
                  style={{ borderTop: `1px solid ${EMBER.border}` }}
                >
                  <p style={{ fontSize: 11, color: EMBER.textTertiary }}>
                    You're not on the board yet — play a duel to climb
                  </p>
                </div>
              )}
            </div>

            {/* Tier ladder context — shown when the board is thin */}
            {isSparse && (
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-3"
                  style={{ color: EMBER.textTertiary }}
                >
                  Climb the ranks
                </p>
                <TierLadder myTierName={myEntry?.tier} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
