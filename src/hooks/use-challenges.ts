import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import type {
  ChallengeSetResponse,
  PracticeSetRequest,
  ValidateAnswerRequest,
  ValidationResult,
} from '@/types/challenge.types';

/**
 * Fetch a fresh solo practice set. Modelled as a mutation because it is an
 * imperative "deal me a new round" action (like useCreateDuel), not cacheable
 * read state — replaying should always hit the server for a new matchSeed.
 */
export function usePracticeSet() {
  return useMutation({
    mutationFn: (data: PracticeSetRequest = {}) =>
      api
        .post<ChallengeSetResponse>('/challenges/practice', {
          mode: 'speed_math',
          count: 10,
          difficulty: 3,
          ...data,
        })
        .then((r) => r.data),
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to start practice'));
    },
  });
}

/** Validate a single answer against the server (authoritative scoring). */
export function useValidateAnswer() {
  return useMutation({
    mutationFn: (data: ValidateAnswerRequest) =>
      api.post<ValidationResult>('/challenges/validate', data).then((r) => r.data),
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to check answer'));
    },
  });
}
