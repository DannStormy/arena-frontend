import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type {
  GameSession,
  GameQuestion,
  AnswerResult
} from '@/types/game.types';

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
