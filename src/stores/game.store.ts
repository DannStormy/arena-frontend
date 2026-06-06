import { create } from 'zustand';

interface Question {
  id: string;
  content: string;
  options: string[];
  category: string;
  difficulty: string;
}

interface GameState {
  sessionId: string | null;
  tournamentId: string | null;
  currentQuestion: Question | null;
  score: number;
  totalAnswered: number;
  totalQuestions: number;
  isFlagged: boolean;
  isComplete: boolean;
  finalScore: number | null;

  startSession: (sessionId: string, tournamentId: string, totalQuestions: number) => void;
  setCurrentQuestion: (question: Question) => void;
  recordAnswer: (isCorrect: boolean, score: number, totalAnswered: number, isFlagged: boolean) => void;
  completeSession: (finalScore: number) => void;
  resetGame: () => void;
}

const initialState = {
  sessionId: null,
  tournamentId: null,
  currentQuestion: null,
  score: 0,
  totalAnswered: 0,
  totalQuestions: 0,
  isFlagged: false,
  isComplete: false,
  finalScore: null,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  startSession: (sessionId, tournamentId, totalQuestions) =>
    set({ sessionId, tournamentId, totalQuestions, isComplete: false, score: 0, totalAnswered: 0 }),

  setCurrentQuestion: (question) => set({ currentQuestion: question }),

  recordAnswer: (_isCorrect, score, totalAnswered, isFlagged) =>
    set({ score, totalAnswered, isFlagged }),

  completeSession: (finalScore) => set({ isComplete: true, finalScore }),

  resetGame: () => set(initialState),
}));
