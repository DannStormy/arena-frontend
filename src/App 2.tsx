import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/sonner';

import { AuthRoute } from '@/components/layout/AuthRoute';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { RootLayout } from '@/components/layout/RootLayout';

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
            </Route>

            <Route path="/game/:sessionId" element={<GamePage />} />
            <Route path="/game/:sessionId/result" element={<GameResultPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
