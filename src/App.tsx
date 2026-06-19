import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/sonner';

import { AuthRoute } from '@/components/layout/AuthRoute';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { RootLayout } from '@/components/layout/RootLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';

import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { HomePage } from '@/pages/home/HomePage';
import { TournamentDetailPage } from '@/pages/tournament/TournamentDetailPage';
import { TournamentLeaderboardPage } from '@/pages/tournament/TournamentLeaderboardPage';
import { GamePage } from '@/pages/game/GamePage';
import { GameResultPage } from '@/pages/game/GameResultPage';
import { WalletPage } from '@/pages/wallet/WalletPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { LeaderboardPage } from '@/pages/leaderboard/LeaderboardPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminTournamentsPage } from '@/pages/admin/AdminTournamentsPage';
import { AdminTournamentDetailPage } from '@/pages/admin/AdminTournamentDetailPage';
import { AdminQuestionsPage } from '@/pages/admin/AdminQuestionsPage';
import { AdminFlaggedPage } from '@/pages/admin/AdminFlaggedPage';
import { AdminPayoutsPage } from '@/pages/admin/AdminPayoutsPage';
import { AdminProgressionConfigPage } from '@/pages/admin/AdminProgressionConfigPage';
import { DuelsPage } from '@/pages/duels/DuelsPage';
import { CreateDuelPage } from '@/pages/duels/CreateDuelPage';
import { DuelWaitingPage } from '@/pages/duels/DuelWaitingPage';
import { JoinDuelPage } from '@/pages/duels/JoinDuelPage';
import { DuelGamePage } from '@/pages/duels/DuelGamePage';
import { DuelResultPage } from '@/pages/duels/DuelResultPage';
import { ChallengePreviewPage } from '@/pages/duels/ChallengePreviewPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-center" theme="dark" richColors />
        <Routes>
          <Route element={<AuthRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<RootLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
              <Route path="/tournaments/:id/leaderboard" element={<TournamentLeaderboardPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/duels" element={<DuelsPage />} />
            </Route>

            <Route path="/game/:sessionId" element={<GamePage />} />
            <Route path="/game/:sessionId/result" element={<GameResultPage />} />
            <Route path="/duels/create" element={<CreateDuelPage />} />
            <Route path="/duels/:code/join" element={<JoinDuelPage />} />
            <Route path="/duels/:code/waiting" element={<DuelWaitingPage />} />
            <Route path="/duels/:id/play" element={<DuelGamePage />} />
            <Route path="/duels/:id/result" element={<DuelResultPage />} />
          </Route>

          <Route element={<ProtectedRoute adminOnly />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/tournaments" element={<AdminTournamentsPage />} />
              <Route path="/admin/tournaments/:id" element={<AdminTournamentDetailPage />} />
              <Route path="/admin/questions" element={<AdminQuestionsPage />} />
              <Route path="/admin/flagged" element={<AdminFlaggedPage />} />
              <Route path="/admin/payouts" element={<AdminPayoutsPage />} />
              <Route path="/admin/progression" element={<AdminProgressionConfigPage />} />
            </Route>
          </Route>

          <Route path="/duels/:code" element={<ChallengePreviewPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
