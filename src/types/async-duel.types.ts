// Async-duel client types — mirror the arena-api /async-duels contract.
// Confirmed against src/async-duels/dto/*.dto.ts and types/*.enum.ts.
//
// The server is authoritative: the returned set never carries answers, and the
// opponent's score stays hidden until the requester has submitted their own run.

import type { Challenge, ChallengeMode } from '@/types/challenge.types';

export type AsyncDuelMatchType = 'challenge_link' | 'ghost';

export type AsyncDuelStatus = 'awaiting_opponent' | 'completed' | 'cancelled';

export type DuelResolution =
  | 'score'
  | 'speed_tiebreak'
  | 'sudden_death'
  | 'forfeit'
  | 'draw';

// ── Requests ─────────────────────────────────────────────────────────────────

export interface CreateAsyncDuelRequest {
  mode: ChallengeMode;
  difficulty: number;
  count?: number;
}

export interface MatchmakeAsyncDuelRequest {
  mode: ChallengeMode;
  difficulty: number;
}

export interface AsyncDuelAnswerInput {
  /** Zero-based challenge index within the set. */
  index: number;
  /** The submitted answer (shape depends on the challenge answerType). */
  answer: unknown;
  /** Time the player took on this challenge, in ms. */
  elapsedMs: number;
}

export interface SubmitAsyncDuelRequest {
  answers: AsyncDuelAnswerInput[];
}

// ── Responses ────────────────────────────────────────────────────────────────

/** Playable set — returned on create, matchmake, and GET :code. Never has answers. */
export interface AsyncDuelSetResponse {
  id: string;
  code: string;
  matchSeed: string;
  mode: ChallengeMode;
  difficulty: number;
  matchType: AsyncDuelMatchType;
  challenges: Challenge[];
  /** opponent.score is only present once the requester has finished. */
  opponent?: { score: number | null } | null;
  /** True once the requesting player has already submitted their run. */
  alreadyCompleted?: boolean;
}

/** Progression snapshot as returned by the backend (field names differ slightly
 * from the frontend ProgressionData used by ProgressionReveal — map before use). */
export interface AsyncDuelProgressionSnapshot {
  xpBefore: number;
  xpAfter: number;
  levelBefore: number;
  levelAfter: number;
  intoLevelBefore: number;
  intoLevelAfter: number;
  nextLevelAt: number | null;
  spBefore: number;
  spAfter: number;
  rankBefore: string;
  rankAfter: string;
  rankFloor: number;
  nextRankAt: number | null;
  xpAwarded: number;
  spAwarded: number;
  firstGameOfDayBonus: number;
}

export interface AsyncDuelSideResult {
  userId: string | null;
  score: number;
  correct: number;
  elapsedMs: number;
  completed: boolean;
  progression: AsyncDuelProgressionSnapshot | null;
}

export interface AsyncDuelResult {
  id: string;
  code: string;
  matchType: AsyncDuelMatchType;
  status: AsyncDuelStatus;
  winnerId: string | null;
  resolution: DuelResolution | null;
  isTie: boolean;
  creator: AsyncDuelSideResult;
  opponent: AsyncDuelSideResult;
}
