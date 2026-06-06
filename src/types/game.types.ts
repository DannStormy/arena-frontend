export interface GameSession {
  id: string;
  tournamentId: string;
  gameType: string;
  status: string;
  totalQuestions: number;
  startedAt: string;
}

export interface GameQuestion {
  id: string;
  content: string;
  options: string[];
  category: string;
  difficulty: string;
}

export interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: number;
  score: number;
  totalAnswered: number;
  isFlagged: boolean;
  completed: boolean;
  finalScore?: number;
}
