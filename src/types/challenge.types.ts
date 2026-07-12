// Solo practice challenge types — mirror the arena-api /challenges contract.
// The server is authoritative: challenges never carry the answer, and validation
// is re-derived from (matchSeed, index). We echo matchSeed/mode/difficulty back.

export type ChallengeMode = 'speed_math' | 'brain_duel';

// The registry only ships the MATH generator today; the others are declared on
// the backend roadmap and flow into brain_duel automatically once registered.
export type ChallengeType = 'math' | 'word' | 'pattern' | 'memory' | 'quiz';

export type AnswerType = 'number' | 'text' | 'choice';

export interface ChallengePrompt {
  /** Display string, e.g. "12 × 7" (math). */
  expression?: string;
  /** Operator glyph, e.g. "×" (math). */
  op?: string;
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
  /** Number or numeric string — server coerces. */
  answer: number | string;
  /** Milliseconds the user took to answer this challenge. */
  elapsedMs: number;
}

export interface ValidationResult {
  index: number;
  correct: boolean;
  score: number;
}
