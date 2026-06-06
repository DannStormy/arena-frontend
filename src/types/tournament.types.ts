export type TournamentArena =
  | 'naija_street_smarts'
  | 'sports_arena'
  | 'entertainment_zone'
  | 'brain_box'
  | 'faith_and_values'
  | 'tech_and_hustle';

export type TournamentStatus =
  | 'draft'
  | 'open'
  | 'in_progress'
  | 'completed'
  | 'cancelled';
export type GameType = 'lightning_trivia' | 'last_man_standing';

export interface Tournament {
  id: string;
  title: string;
  arena: TournamentArena;
  gameType: GameType;
  entryFee: string;
  prizeFirst: string;
  prizeSecond: string | null;
  prizeThird: string | null;
  maxPlayers: number | null;
  minPlayers: number;
  status: TournamentStatus;
  scheduledAt: string | null;
  isFunded: boolean;
  createdAt: string;
  playerCount?: number;
  hasJoined?: boolean;
}

export interface TournamentEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  score: number;
  prizeWon: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
