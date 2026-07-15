import type { Challenge, ChallengeType } from '@/types/challenge.types';
import type { SeededRng } from './seeded-rng';

/**
 * Server-only shape: the client-safe {@link Challenge} plus the answer. In the
 * ported client engine `answer` is used purely locally for re-derivation during
 * {@link validateLocal}; it is stripped before a set is handed to the UI.
 */
export type GeneratedChallenge = Challenge & { answer: unknown };

/**
 * A pluggable source of one challenge type. Mirrors arena-api's
 * ChallengeGenerator so the port stays faithful and self-consistent.
 */
export interface ChallengeGenerator {
  readonly type: ChallengeType;

  /** Deterministically build one challenge from a seeded rng. */
  generate(rng: SeededRng, difficulty: number, index: number): GeneratedChallenge;

  /** Correctness check (re-derived challenge vs. submission). */
  validate(challenge: GeneratedChallenge, submitted: unknown): boolean;

  /** Points for a submission, factoring in correctness and speed. */
  score(challenge: GeneratedChallenge, submitted: unknown, elapsedMs: number): number;
}
