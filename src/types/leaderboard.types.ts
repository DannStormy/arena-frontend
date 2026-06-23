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
