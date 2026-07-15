import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { generateSet, validateLocal } from '@/lib/challenge-engine';
import { getErrorMessage } from '@/lib/utils';
import type {
  ChallengeSetResponse,
  PracticeSetRequest,
  ValidateAnswerRequest,
  ValidationResult,
} from '@/types/challenge.types';

/**
 * A network-LEVEL failure (offline, DNS, timeout, connection refused) vs. a real
 * HTTP error. Axios sets `isAxiosError` on both, but only attaches `response`
 * when the server actually answered. No response => the request never reached a
 * server => safe to fall back to the local deterministic engine. A 4xx/5xx DID
 * reach the server and is authoritative — we must propagate it, never mask it.
 */
function isOfflineError(err: unknown): boolean {
  return axios.isAxiosError(err) && !err.response;
}

/**
 * Fetch a fresh solo practice set. Modelled as a mutation because it is an
 * imperative "deal me a new round" action (like useCreateDuel), not cacheable
 * read state — replaying should always hit the server for a new matchSeed.
 *
 * OFFLINE: on a network-level failure only, generate the set on-device with the
 * ported deterministic engine (client-random matchSeed) so Speed Math and Memory
 * stay fully playable with no connection. Real HTTP errors still surface.
 */
export function usePracticeSet() {
  return useMutation({
    mutationFn: async (data: PracticeSetRequest = {}): Promise<ChallengeSetResponse> => {
      const mode = data.mode ?? 'speed_math';
      const count = data.count ?? 10;
      const difficulty = data.difficulty ?? 3;
      try {
        const res = await api.post<ChallengeSetResponse>('/challenges/practice', {
          mode,
          count,
          difficulty,
        });
        return res.data;
      } catch (err) {
        if (isOfflineError(err)) {
          // Offline fallback — a client seed, never sent to the server.
          return generateSet({ matchSeed: crypto.randomUUID(), mode, count, difficulty });
        }
        throw err;
      }
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to start practice'));
    },
  });
}

/**
 * Validate a single answer. Online this is authoritative server scoring; on a
 * network-level failure it re-derives and scores locally via the same engine the
 * set was generated with (offline runs award no server XP — fine for v1).
 */
export function useValidateAnswer() {
  return useMutation({
    mutationFn: async (data: ValidateAnswerRequest): Promise<ValidationResult> => {
      try {
        const res = await api.post<ValidationResult>('/challenges/validate', data);
        return res.data;
      } catch (err) {
        if (isOfflineError(err)) {
          return validateLocal({
            matchSeed: data.matchSeed,
            mode: data.mode,
            difficulty: data.difficulty,
            index: data.index,
            answer: data.answer,
            elapsedMs: data.elapsedMs,
          });
        }
        throw err;
      }
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to check answer'));
    },
  });
}
