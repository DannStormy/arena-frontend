import type { TournamentArena } from '@/types/tournament.types';

export type DuelMode = 'trivia' | 'sudden_death' | 'blitz' | 'streak' | 'steal';
export type DuelStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'sudden_death_round';

export const DUEL_MODE_CONFIG: Record<
  DuelMode,
  { label: string; description: string; timerSeconds: number | null }
> = {
  trivia: {
    label: 'Trivia Duel',
    description: 'Answer 10 questions. Best score wins.',
    timerSeconds: 10,
  },
  sudden_death: {
    label: 'Sudden Death',
    description: "One wrong answer and you're out.",
    timerSeconds: null,
  },
  blitz: {
    label: 'Blitz',
    description: '5 questions. 5 seconds each. No mercy.',
    timerSeconds: 5,
  },
  streak: {
    label: 'Streak',
    description: 'Chain correct answers for multiplier points.',
    timerSeconds: 10,
  },
  steal: {
    label: 'Steal Mode',
    description: 'Wrong answers can be stolen by your opponent.',
    timerSeconds: 10,
  },
};

export interface Duel {
  id: string;
  code: string;
  mode: DuelMode;
  arena: TournamentArena;
  stake: string;
  status: DuelStatus;
  challengerId: string;
  challengerUsername: string;
  opponentId: string | null;
  opponentUsername: string | null;
  challengerScore: number;
  opponentScore: number;
  challengerCorrect?: number;
  opponentCorrect?: number;
  challengerStreak?: number;
  opponentStreak?: number;
  totalQuestions?: number;
  currentQuestionIndex?: number;
  suddenDeathRounds?: number;
  questionSummary?: { questionIndex: number; challengerResult: string; opponentResult: string; questionId?: string }[];
  winnerId: string | null;
  isTie: boolean;
  tiebreakDeltaMs?: number;
  resolution?: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface DuelQuestion {
  id: string;
  content: string;
  options: string[];
  difficulty: string;
}

export interface DuelHistoryItem {
  id: string;
  code: string;
  mode: DuelMode;
  arena: TournamentArena;
  stake: string;
  status: DuelStatus;
  challengerId: string;
  challengerUsername?: string | null;
  opponentId: string | null;
  opponentUsername?: string | null;
  challengerScore: number;
  opponentScore: number;
  challengerMaxStreak?: number;
  opponentMaxStreak?: number;
  prizeWon: string;
  suddenDeathRounds?: number;
  winnerId: string | null;
  isTie: boolean;
  tiebreakDeltaMs?: number;
  resolution?: string;
  createdAt: string;
}

// ── Socket event payloads ────────────────────────────────────────────────────

export interface DuelReadyPayload {
  duelId: string;
  mode: DuelMode;
  arena: TournamentArena;
  totalQuestions: number;
  opponentUsername: string;
}

export interface QuestionReadyPayload {
  questionIndex: number;
  totalQuestions: number;
  question: DuelQuestion;
  timeoutSeconds: number | null;
  challengerScore: number;
  opponentScore: number;
  challengerStreak?: number;
  opponentStreak?: number;
}

export interface AnswerResultPayload {
  isCorrect: boolean;
  correctAnswer: number;
  pointsEarned: number;
  yourScore: number;
  yourStreak?: number;
  stealOpportunity?: boolean;
}

export interface OpponentAnsweredPayload {
  isCorrect: boolean;
  opponentScore: number;
  opponentStreak?: number;
  stealOpportunity?: boolean;
  stealTimeoutSeconds?: number;
}

export interface StealOpportunityPayload {
  questionId: string;
  question: DuelQuestion;
  timeoutSeconds: number;
}

export interface ProgressionData {
  xpBefore: number;
  xpAfter: number;
  intoLevelBefore: number;
  intoLevelAfter: number;
  nextLevelAt: number;
  levelBefore: number;
  levelAfter: number;
  spBefore: number;
  spAfter: number;
  rankBefore: string;
  rankAfter: string;
  rankFloor: number;
  nextRankAt: number;
  firstDuelOfDayBonus?: number;
}

export interface OpponentProgression {
  tier: string;
  rankPoints: number;
}

export interface DuelCompletePayload {
  winnerId: string | null;
  isTie: boolean;
  challengerScore: number;
  opponentScore: number;
  challengerMaxStreak?: number;
  opponentMaxStreak?: number;
  prizeWon: string;
  suddenDeathRounds?: number;
  myProgression?: ProgressionData;
  opponentProgression?: OpponentProgression | null;
}

export interface DuelForfeitedPayload {
  forfeitedBy: string;
  winnerId: string;
  forfeited: boolean;
}

// ── Typed Socket.io event maps ────────────────────────────────────────────────

export type ServerToClientEvents = {
  duel_ready: (payload: DuelReadyPayload) => void;
  question_ready: (payload: QuestionReadyPayload) => void;
  answer_result: (payload: AnswerResultPayload) => void;
  opponent_answered: (payload: OpponentAnsweredPayload) => void;
  steal_opportunity: (payload: StealOpportunityPayload) => void;
  steal_result: () => void;
  duel_complete: (payload: DuelCompletePayload) => void;
  duel_forfeited: (payload: DuelForfeitedPayload) => void;
  opponent_disconnected: (payload: { forfeitTimeoutSeconds: number }) => void;
};

export type ClientToServerEvents = {
  join_duel: (payload: { duelId: string }) => void;
  submit_answer: (payload: {
    duelId: string;
    questionId: string;
    selectedAnswer: number;
    timeTakenMs: number;
    isSteal?: boolean;
  }) => void;
};
