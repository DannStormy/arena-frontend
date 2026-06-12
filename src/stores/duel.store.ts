import { create } from 'zustand';
import type {
  DuelMode,
  DuelQuestion,
  DuelReadyPayload,
  QuestionReadyPayload,
  AnswerResultPayload,
  OpponentAnsweredPayload,
  StealOpportunityPayload,
  DuelCompletePayload,
} from '@/types/duel.types';

interface DuelState {
  duelId: string | null;
  mode: DuelMode | null;
  opponentUsername: string | null;
  currentQuestion: DuelQuestion | null;
  questionIndex: number;
  totalQuestions: number;
  myScore: number;
  opponentScore: number;
  myStreak: number;
  opponentStreak: number;
  hasAnswered: boolean;
  opponentHasAnswered: boolean;
  correctAnswer: number | null;
  stealOpportunity: StealOpportunityPayload | null;
  stealTimeRemaining: number;
  myAlive: boolean;
  opponentAlive: boolean;
  isComplete: boolean;
  result: DuelCompletePayload | null;
  socketConnected: boolean;

  initDuel: (payload: DuelReadyPayload) => void;
  setQuestion: (payload: QuestionReadyPayload) => void;
  recordMyAnswer: (payload: AnswerResultPayload) => void;
  recordOpponentAnswer: (payload: OpponentAnsweredPayload) => void;
  setStealOpportunity: (payload: StealOpportunityPayload) => void;
  clearStealOpportunity: () => void;
  setSocketConnected: (connected: boolean) => void;
  completeDuel: (payload: DuelCompletePayload) => void;
  resetDuel: () => void;
}

const initialState = {
  duelId: null,
  mode: null,
  opponentUsername: null,
  currentQuestion: null,
  questionIndex: 0,
  totalQuestions: 0,
  myScore: 0,
  opponentScore: 0,
  myStreak: 0,
  opponentStreak: 0,
  hasAnswered: false,
  opponentHasAnswered: false,
  correctAnswer: null,
  stealOpportunity: null,
  stealTimeRemaining: 0,
  myAlive: true,
  opponentAlive: true,
  isComplete: false,
  result: null,
  socketConnected: false,
};

export const useDuelStore = create<DuelState>((set) => ({
  ...initialState,

  initDuel: (payload) =>
    set({
      duelId: payload.duelId,
      mode: payload.mode,
      opponentUsername: payload.opponentUsername,
      totalQuestions: payload.totalQuestions,
      myScore: 0,
      opponentScore: 0,
      myStreak: 0,
      opponentStreak: 0,
      myAlive: true,
      opponentAlive: true,
      isComplete: false,
      result: null,
    }),

  setQuestion: (payload) =>
    set({
      currentQuestion: payload.question,
      questionIndex: payload.questionIndex,
      totalQuestions: payload.totalQuestions,
      myScore: payload.challengerScore,
      opponentScore: payload.opponentScore,
      myStreak: payload.challengerStreak ?? 0,
      opponentStreak: payload.opponentStreak ?? 0,
      hasAnswered: false,
      opponentHasAnswered: false,
      correctAnswer: null,
      stealOpportunity: null,
    }),

  recordMyAnswer: (payload) =>
    set({
      hasAnswered: true,
      myScore: payload.yourScore,
      myStreak: payload.yourStreak ?? 0,
      correctAnswer: payload.correctAnswer,
    }),

  recordOpponentAnswer: (payload) =>
    set({
      opponentHasAnswered: true,
      opponentScore: payload.opponentScore,
      opponentStreak: payload.opponentStreak ?? 0,
    }),

  setStealOpportunity: (payload) =>
    set({ stealOpportunity: payload, stealTimeRemaining: payload.timeoutSeconds }),

  clearStealOpportunity: () =>
    set({ stealOpportunity: null, stealTimeRemaining: 0 }),

  setSocketConnected: (connected) => set({ socketConnected: connected }),

  completeDuel: (payload) =>
    set({ isComplete: true, result: payload }),

  resetDuel: () => set(initialState),
}));
