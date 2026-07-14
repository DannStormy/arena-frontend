export const queryKeys = {
  tournaments: {
    all: ['tournaments'] as const,
    list: (filters?: Record<string, unknown>) => ['tournaments', 'list', filters] as const,
    detail: (id: string) => ['tournaments', id] as const,
    leaderboard: (id: string) => ['tournaments', id, 'leaderboard'] as const,
  },
  wallet: {
    summary: ['wallet'] as const,
    transactions: (page: number) => ['wallet', 'transactions', page] as const,
  },
  leaderboard: {
    global: (arena?: string) => ['leaderboard', arena ?? 'all'] as const,
  },
  game: {
    session: (id: string) => ['game-sessions', id] as const,
    nextQuestion: (id: string) => ['game-sessions', id, 'next-question'] as const,
    sessionQuestions: (id: string) => ['game-sessions', id, 'questions'] as const,
  },
  challenges: {
    all: ['challenges'] as const,
    practice: (mode: string, difficulty: number) =>
      ['challenges', 'practice', mode, difficulty] as const,
  },
  daily: {
    all: ['daily'] as const,
    today: ['daily', 'today'] as const,
    leaderboard: ['daily', 'leaderboard'] as const,
  },
  duels: {
    all: ['duels'] as const,
    history: ['duels', 'history'] as const,
    historyInfinite: ['duels', 'history', 'infinite'] as const,
    detail: (id: string) => ['duels', id] as const,
    byCode: (code: string) => ['duels', 'code', code] as const,
  },
  asyncDuels: {
    all: ['async-duels'] as const,
    set: (code: string) => ['async-duels', 'set', code] as const,
    result: (id: string) => ['async-duels', 'result', id] as const,
  },
  admin: {
    stats: ['admin', 'stats'] as const,
    tournaments: ['admin', 'tournaments'] as const,
    tournament: (id: string) => ['admin', 'tournaments', id] as const,
    tournamentEntries: (id: string) => ['admin', 'tournaments', id, 'entries'] as const,
    questions: ['admin', 'questions'] as const,
    reportedQuestions: ['admin', 'questions', 'reported'] as const,
    flagged: ['admin', 'flagged'] as const,
    payouts: ['admin', 'payouts'] as const,
    progressionConfig: ['admin', 'progression', 'config'] as const,
    progressionConfigVersionsBase: ['admin', 'progression', 'versions'] as const,
    progressionConfigVersions: (page: number, limit: number) =>
      ['admin', 'progression', 'versions', page, limit] as const,
  },
};
