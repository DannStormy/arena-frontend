// The main Leaderboard.
//
// DEFAULT tab — "All-time" (GET /leaderboard/level): the real, populated board.
// Every mode that awards level-XP (solo Speed Math, Memory, the Daily, duels)
// feeds it, so anyone who plays climbs. Ranked by XP, showing level + XP.
//
// Secondary tab — "Season duels" (GET /leaderboard/duels): a GLOBAL per-season
// duel-rank ledger. It only moves on real-time duels, so it's empty until there
// are live opponents. Kept behind a tab rather than fronting a dead screen.

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { EMBER } from '@/lib/ember';
import { useAuthStore } from '@/stores/auth.store';
import { useLevelLeaderboard } from '@/hooks/use-leaderboard';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  TierBadge,
  TIER_THRESHOLDS,
  normalizeTierName,
  getTierDisplayName,
} from '@/components/common/TierBadge';
import type {
  LeaderboardEntry,
  LevelLeaderboardEntry,
} from '@/types/leaderboard.types';
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

// ══ All-time XP/level board ════════════════════════════════════════════════════

function LevelEntryRow({ entry }: { entry: LevelLeaderboardEntry }) {
  const rank     = entry.rank;
  const isMe     = entry.isRequestingUser;
  const isPodium = rank <= 3;
  const podium   = PODIUM[rank];
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
        style={{ width: 28, fontSize: isPodium ? 15 : 12, color: rankColor }}
      >
        {rank}
      </span>

      {/* Avatar — real photo when present, else clipped ember initials */}
      <div
        className="clip-avatar flex items-center justify-center shrink-0 font-bold text-xs text-white select-none overflow-hidden"
        style={{
          width: isPodium ? 36 : 30,
          height: isPodium ? 36 : 30,
          background: isMe
            ? 'linear-gradient(150deg, #E8893B, #C2541E)'
            : 'rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}
      >
        {entry.avatarUrl ? (
          <img
            src={entry.avatarUrl}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          (entry.avatarInitials || entry.username.slice(0, 2)).toUpperCase()
        )}
      </div>

      {/* Name */}
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
      </div>

      {/* Fixed right section: level chip | XP */}
      <div
        className="grid shrink-0 items-center"
        style={{ gridTemplateColumns: '46px 64px', columnGap: 8 }}
      >
        <div className="flex justify-center">
          <span
            className="clip-chip font-display font-bold tabular-nums px-1.5 py-0.5"
            style={{
              fontSize: 10,
              letterSpacing: '0.04em',
              background: isMe ? 'rgba(232,137,59,0.18)' : 'rgba(240,232,220,0.06)',
              color: isMe ? EMBER.accent : EMBER.textSecondary,
            }}
          >
            Lv {entry.level}
          </span>
        </div>
        <div className="text-right">
          <p
            className="font-display font-bold tabular-nums leading-none"
            style={{
              fontSize: isPodium ? 14 : 12,
              color: isMe ? EMBER.accent : EMBER.textPrimary,
            }}
          >
            {entry.xp.toLocaleString()}
          </p>
          <p
            className="font-semibold uppercase tracking-[0.10em]"
            style={{ fontSize: 8, color: EMBER.textTertiary, marginTop: 2 }}
          >
            XP
          </p>
        </div>
      </div>
    </div>
  );
}

function LevelBoard() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useLevelLeaderboard(page);

  const entries    = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  // Truly empty — should not happen live, but handle it honestly.
  if (entries.length === 0) {
    return (
      <div
        className="clip-card p-5 text-center mt-2"
        style={{ background: EMBER.surface }}
      >
        <p
          className="font-display font-bold text-lg mb-1"
          style={{ color: EMBER.textPrimary }}
        >
          No players yet
        </p>
        <p className="text-sm" style={{ color: EMBER.textTertiary }}>
          Play a round to earn XP and claim the top spot
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: EMBER.textTertiary }}
      >
        All-time · by XP
      </p>

      <div className="space-y-1.5">
        {entries.map((entry) => (
          <LevelEntryRow key={entry.userId} entry={entry} />
        ))}
      </div>

      {/* Pagination — only when there's more than one page */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isFetching}
            className="clip-chip font-display font-bold px-3 py-1.5 disabled:opacity-40 transition-opacity"
            style={{ fontSize: 11, background: EMBER.surface, color: EMBER.textSecondary }}
          >
            Prev
          </button>
          <span
            className="font-display tabular-nums"
            style={{ fontSize: 11, color: EMBER.textTertiary }}
          >
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isFetching}
            className="clip-chip font-display font-bold px-3 py-1.5 disabled:opacity-40 transition-opacity"
            style={{ fontSize: 11, background: EMBER.surface, color: EMBER.textSecondary }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ══ Season duel-rank board (empty until there are live opponents) ══════════════

function DuelEntryRow({
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
      {(isMe || isPodium) && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ background: leftBarColor, boxShadow: leftBarGlow }}
        />
      )}

      <span
        className="font-display font-bold tabular-nums shrink-0 text-center"
        style={{ width: 28, fontSize: isPodium ? 15 : 12, color: rankColor }}
      >
        {rank}
      </span>

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

// Tier ladder — shown when the duel board is empty or sparse so the screen has
// something aspirational rather than a black void.
function TierLadder({ myTierName }: { myTierName?: string }) {
  const myTier = myTierName != null ? normalizeTierName(myTierName) : null;

  return (
    <div className="clip-card overflow-hidden" style={{ background: EMBER.surface }}>
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

function DuelBoard() {
  const userId = useAuthStore((s) => s.user?.id);

  const { data: entries, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: queryKeys.leaderboard.global(),
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<LeaderboardEntry>>('/leaderboard/duels');
      return Array.isArray(response.data?.data) ? response.data.data : [];
    },
  });

  const isInList = entries?.some((e) => e.userId === userId) ?? false;
  const myEntry  = entries?.find((e) => e.userId === userId);
  const isSparse = (entries?.length ?? 0) <= 3;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="space-y-4 pt-2">
        <div className="clip-card p-5 text-center" style={{ background: EMBER.surface }}>
          <p
            className="font-display font-bold text-lg mb-1"
            style={{ color: EMBER.textPrimary }}
          >
            First blood — no duel ranks yet
          </p>
          <p className="text-sm" style={{ color: EMBER.textTertiary }}>
            Play a live duel to claim your spot on the season board
          </p>
        </div>
        <TierLadder myTierName={myEntry?.tier} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5">
        {entries.map((entry, i) => {
          const rank = entry.rank ?? (i + 1);
          const isMe = entry.userId === userId;
          return (
            <DuelEntryRow key={entry.userId} entry={entry} rank={rank} isMe={isMe} />
          );
        })}

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
  );
}

// ══ Page ═══════════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'all-time', label: 'All-time' },
  { id: 'season',   label: 'Season duels' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function LeaderboardPage() {
  const [tab, setTab] = useState<TabId>('all-time');

  return (
    <div className="flex flex-col min-h-full" style={{ background: EMBER.base }}>
      <PageHeader title="Leaderboard" />

      {/* Tab toggle — All-time (XP, the real board) is default */}
      <div className="px-4 pt-1">
        <div className="flex gap-1" style={{ borderBottom: `1px solid ${EMBER.border}` }}>
          {TABS.map(({ id, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="px-4 py-2 font-semibold -mb-px transition-colors"
                style={{
                  fontSize: 13,
                  borderBottom: `2px solid ${active ? EMBER.accent : 'transparent'}`,
                  color: active ? EMBER.accent : EMBER.textTertiary,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 px-4 pb-6">
        {tab === 'all-time' ? <LevelBoard /> : <DuelBoard />}
      </div>
    </div>
  );
}
