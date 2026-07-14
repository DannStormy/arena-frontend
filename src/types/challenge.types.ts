// Solo practice challenge types — mirror the arena-api /challenges contract.
// The server is authoritative: challenges never carry the answer, and validation
// is re-derived from (matchSeed, index). We echo matchSeed/mode/difficulty back.

export type ChallengeMode = 'speed_math' | 'brain_duel' | 'memory';

// The registry only ships the MATH generator today; the others are declared on
// the backend roadmap and flow into brain_duel automatically once registered.
export type ChallengeType = 'math' | 'word' | 'pattern' | 'memory' | 'quiz';

export type AnswerType = 'number' | 'text' | 'choice' | 'sequence';

export interface ChallengePrompt {
  /** Display string, e.g. "12 × 7" (math). */
  expression?: string;
  /** Operator glyph, e.g. "×" (math). */
  op?: string;
  /** Memory mode — the tile-index sequence to flash, in order. */
  sequence?: number[];
  /** Memory mode — tiles on the board (e.g. 9 => a 3×3 grid). */
  gridSize?: number;
  /** Generator-specific fields for future challenge types. */
  [key: string]: unknown;
}

export interface Challenge {
  index: number;
  type: ChallengeType;
  difficulty: number;
  answerType: AnswerType;
  prompt: ChallengePrompt;
  maxScore: number;
  timeLimitMs: number;
}

export interface ChallengeSetResponse {
  matchSeed: string;
  mode: ChallengeMode;
  difficulty: number;
  challenges: Challenge[];
}

export interface PracticeSetRequest {
  mode?: ChallengeMode;
  count?: number;
  difficulty?: number;
}

export interface ValidateAnswerRequest {
  matchSeed: string;
  mode: ChallengeMode;
  difficulty: number;
  index: number;
  /**
   * The player's answer. Number/numeric-string for math; number[] (the tapped
   * tile-index sequence) for memory. Server coerces/compares per mode.
   */
  answer: number | string | number[];
  /** Milliseconds the user took to answer this challenge. */
  elapsedMs: number;
}

export interface ValidationResult {
  index: number;
  correct: boolean;
  score: number;
}
