import type { TournamentArena } from './tournament.types';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalScore: number;
  tournamentsWon: number;
  totalEarnings: string;
}

export interface LeaderboardResponse {
  arena: TournamentArena | 'all';
  entries: LeaderboardEntry[];
}
