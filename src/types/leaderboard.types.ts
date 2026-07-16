// Duel-rank leaderboard row — GET /leaderboard/duels.
// Global per-season duel-rank ledger (no per-arena projections). `tier` is the
// real duel-rank tier from BE; `rankPoints` is seasonal duel-rank points.
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  tier: string;
  rankPoints: number;
  gamesPlayed: number;
}

// All-time XP/level leaderboard row — GET /leaderboard/level.
// Every mode that awards level-XP (solo Speed Math, Memory, the Daily, duels)
// feeds this board, so everyone who plays climbs it. `isRequestingUser` marks
// the caller's own row (the BE appends it to `data` if they're off the page).
export interface LevelLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarInitials: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  isRequestingUser: boolean;
}
