/**
 * Client port of the arena-api deterministic challenge engine
 * (src/challenges/challenge.service.ts). Pure, no I/O.
 *
 * Because generation is deterministic per (matchSeed, index), the client can
 * both GENERATE a set (answers stripped, exactly the server's client-safe shape)
 * and VALIDATE a submission by re-deriving the challenge — no answer is stored
 * between the two. This is the engine behind OFFLINE MODE: when the network is
 * unreachable, Speed Math and Memory run entirely on-device.
 *
 * The port only needs to be SELF-consistent (a set generated here validates here
 * with the same answers/scores). Offline sets use a client-random matchSeed and
 * are never sent to the server, so they never need to agree with server output.
 */
import type {
  Challenge,
  ChallengeMode,
  ChallengeSetResponse,
  ChallengeType,
  ValidationResult,
} from '@/types/challenge.types';
import { SeededRng } from './seeded-rng';
import type { ChallengeGenerator, GeneratedChallenge } from './generator.interface';
import { MathGenerator } from './math.generator';
import { MemoryGenerator } from './memory.generator';

const MAX_SET_SIZE = 50;

export interface GenerateSetParams {
  matchSeed: string;
  mode: ChallengeMode;
  count: number;
  difficulty: number;
}

export interface ValidateLocalParams {
  matchSeed: string;
  mode: ChallengeMode;
  difficulty: number;
  index: number;
  /** The player's answer — number/numeric-string for math, number[] for memory. */
  answer: unknown;
  elapsedMs: number;
}

// Registered generators, keyed by type. Mirrors the arena-api registry order so
// generatorForIndex's rng.pick lands on the same type for a given seed.
const GENERATORS: readonly ChallengeGenerator[] = [new MathGenerator(), new MemoryGenerator()];
const GENERATOR_BY_TYPE: Map<ChallengeType, ChallengeGenerator> = new Map(
  GENERATORS.map((g) => [g.type, g]),
);

/** Modes are filters over the registered generators. */
function typesForMode(mode: ChallengeMode): ChallengeType[] {
  let wanted: ChallengeType[];
  switch (mode) {
    case 'speed_math':
      wanted = ['math'];
      break;
    case 'memory':
      wanted = ['memory'];
      break;
    case 'brain_duel':
      // Every registered generator EXCEPT keypad-incompatible ones. Brain Duel is
      // played through the shared numeric ChallengePlayer, so MEMORY (a
      // tap-sequence answer) must not flow in here.
      wanted = [...GENERATOR_BY_TYPE.keys()].filter((t) => t !== 'memory');
      break;
    default:
      throw new Error(`Unsupported mode: ${mode as string}`);
  }

  const available = wanted.filter((t) => GENERATOR_BY_TYPE.has(t));
  if (available.length === 0) {
    throw new Error(`No generators registered for mode: ${mode}`);
  }
  return available;
}

function generatorForIndex(
  matchSeed: string,
  types: ChallengeType[],
  index: number,
): ChallengeGenerator {
  // A separate rng stream so choosing the type doesn't perturb the problem.
  const type = new SeededRng(`${matchSeed}:type:${index}`).pick(types);
  const generator = GENERATOR_BY_TYPE.get(type);
  if (!generator) {
    throw new Error(`No generator for type: ${type}`);
  }
  return generator;
}

function rngFor(matchSeed: string, index: number): SeededRng {
  return new SeededRng(`${matchSeed}:${index}`);
}

/** Strip the server-only `answer` — the client-safe view. */
function toClientChallenge(challenge: GeneratedChallenge): Challenge {
  const safe: Partial<GeneratedChallenge> = { ...challenge };
  delete safe.answer;
  return safe as Challenge;
}

/**
 * Generate a client-safe set (answers stripped), in the exact shape the server's
 * POST /challenges/practice returns.
 */
export function generateSet(params: GenerateSetParams): ChallengeSetResponse {
  const { matchSeed, mode, count, difficulty } = params;
  if (!matchSeed) throw new Error('matchSeed is required');
  if (count < 1 || count > MAX_SET_SIZE) {
    throw new Error(`count must be between 1 and ${MAX_SET_SIZE}`);
  }

  const types = typesForMode(mode);
  const challenges: Challenge[] = [];
  for (let index = 0; index < count; index++) {
    const generator = generatorForIndex(matchSeed, types, index);
    challenges.push(toClientChallenge(generator.generate(rngFor(matchSeed, index), difficulty, index)));
  }

  return { matchSeed, mode, difficulty, challenges };
}

/**
 * Re-derive the challenge at `index` from the seed and check the answer — the
 * same shape the server's POST /challenges/validate returns.
 */
export function validateLocal(params: ValidateLocalParams): ValidationResult {
  const { matchSeed, mode, difficulty, index, answer, elapsedMs } = params;
  if (index < 0) throw new Error('index must be >= 0');

  const types = typesForMode(mode);
  const generator = generatorForIndex(matchSeed, types, index);
  const challenge = generator.generate(rngFor(matchSeed, index), difficulty, index);

  return {
    index,
    correct: generator.validate(challenge, answer),
    score: generator.score(challenge, answer, elapsedMs),
  };
}

export { SeededRng } from './seeded-rng';
