import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/utils';
import type {
  GameSession,
  GameQuestion,
  AnswerResult
} from '@/types/game.types';

export type ReportReason = 'wrong_answer' | 'outdated' | 'unclear';

export function useGameSession(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.game.session(sessionId),
    queryFn: async () => {
      const response = await api.get<GameSession>(
        `/game-sessions/${sessionId}`
      );
      return response.data;
    },
    enabled: false,
  });
}

export function useNextQuestion(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.game.nextQuestion(sessionId),
    queryFn: async () => {
      const response = await api.get<GameQuestion>(
        `/game-sessions/${sessionId}/next-question`
      );
      return response.data;
    },
    enabled: !!sessionId
  });
}

export function useSessionQuestions(sessionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.game.sessionQuestions(sessionId ?? ''),
    queryFn: () =>
      api.get<GameQuestion[]>(`/game-sessions/${sessionId}/questions`).then((r) => r.data),
    enabled: !!sessionId,
    retry: false,  // endpoint may not exist on BE — stop hammering on 404
  });
}

export function useReportQuestion() {
  return useMutation({
    mutationFn: ({ questionId, reason }: { questionId: string; reason: ReportReason }) =>
      api.post(`/questions/${questionId}/report`, { reason }).then((r) => r.data),
    onSuccess: () => toast.success("Question reported — we'll review it"),
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to submit report')),
  });
}

export function useSubmitAnswer(sessionId: string) {
  return useMutation({
    mutationFn: async ({
      questionId,
      selectedAnswer
    }: {
      questionId: string;
      selectedAnswer: number;
    }) => {
      const response = await api.post<AnswerResult>(
        `/game-sessions/${sessionId}/answer`,
        { questionId, selectedAnswer }
      );
      return response.data;
    }
  });
}
