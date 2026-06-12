import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { useDuelStore } from '@/stores/duel.store';
import { getDuelSocket } from '@/lib/duel-socket';
import type {
  DuelReadyPayload,
  QuestionReadyPayload,
  AnswerResultPayload,
  OpponentAnsweredPayload,
  StealOpportunityPayload,
  DuelCompletePayload,
  DuelForfeitedPayload,
} from '@/types/duel.types';

interface UseDuelSocketOptions {
  onDuelReady?: (payload: DuelReadyPayload) => void;
  onDuelComplete?: (payload: DuelCompletePayload) => void;
  onDuelForfeited?: (payload: DuelForfeitedPayload) => void;
}

export function useDuelSocket(
  duelId: string | null,
  options?: UseDuelSocketOptions,
): { socketConnected: boolean } {
  const token = useAuthStore((s) => s.token);
  const socketConnected = useDuelStore((s) => s.socketConnected);
  const {
    initDuel,
    setQuestion,
    recordMyAnswer,
    recordOpponentAnswer,
    setStealOpportunity,
    clearStealOpportunity,
    setSocketConnected,
    completeDuel,
  } = useDuelStore();

  useEffect(() => {
    if (!duelId || !token) return;

    const sock = getDuelSocket(token);

    const onConnect = () => {
      setSocketConnected(true);
      sock.emit('join_duel', { duelId });
    };

    const onDisconnect = () => {
      setSocketConnected(false);
    };

    const onDuelReady = (payload: DuelReadyPayload) => {
      initDuel(payload);
      options?.onDuelReady?.(payload);
    };

    const onQuestionReady = (payload: QuestionReadyPayload) => {
      setQuestion(payload);
    };

    const onAnswerResult = (payload: AnswerResultPayload) => {
      recordMyAnswer(payload);
    };

    const onOpponentAnswered = (payload: OpponentAnsweredPayload) => {
      recordOpponentAnswer(payload);
    };

    const onStealOpportunity = (payload: StealOpportunityPayload) => {
      setStealOpportunity(payload);
    };

    const onStealResult = () => {
      clearStealOpportunity();
    };

    const onDuelComplete = (payload: DuelCompletePayload) => {
      completeDuel(payload);
      options?.onDuelComplete?.(payload);
    };

    const onDuelForfeited = (payload: DuelForfeitedPayload) => {
      options?.onDuelForfeited?.(payload);
    };

    const onOpponentDisconnected = ({ forfeitTimeoutSeconds }: { forfeitTimeoutSeconds: number }) => {
      toast.warning(`Opponent disconnected. Auto-forfeit in ${forfeitTimeoutSeconds}s`);
    };

    sock.on('connect', onConnect);
    sock.on('disconnect', onDisconnect);
    sock.on('duel_ready', onDuelReady);
    sock.on('question_ready', onQuestionReady);
    sock.on('answer_result', onAnswerResult);
    sock.on('opponent_answered', onOpponentAnswered);
    sock.on('steal_opportunity', onStealOpportunity);
    sock.on('steal_result', onStealResult);
    sock.on('duel_complete', onDuelComplete);
    sock.on('duel_forfeited', onDuelForfeited);
    sock.on('opponent_disconnected', onOpponentDisconnected);

    if (!sock.connected) {
      sock.connect();
    } else {
      // Already connected — emit join immediately
      sock.emit('join_duel', { duelId });
      setSocketConnected(true);
    }

    return () => {
      sock.off('connect', onConnect);
      sock.off('disconnect', onDisconnect);
      sock.off('duel_ready', onDuelReady);
      sock.off('question_ready', onQuestionReady);
      sock.off('answer_result', onAnswerResult);
      sock.off('opponent_answered', onOpponentAnswered);
      sock.off('steal_opportunity', onStealOpportunity);
      sock.off('steal_result', onStealResult);
      sock.off('duel_complete', onDuelComplete);
      sock.off('duel_forfeited', onDuelForfeited);
      sock.off('opponent_disconnected', onOpponentDisconnected);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duelId, token]);

  return { socketConnected };
}
