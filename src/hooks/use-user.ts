import { useMutation, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { getErrorMessage } from '@/lib/utils';

export interface ResolveAccountResult {
  accountName: string;
}

export function useResolveAccount(accountNumber: string, bankCode: string) {
  return useQuery<ResolveAccountResult>({
    queryKey: ['bank-resolve', accountNumber, bankCode],
    queryFn: () =>
      api
        .get(`/users/bank/resolve?accountNumber=${accountNumber}&bankCode=${bankCode}`)
        .then((r) => r.data),
    enabled: accountNumber.length === 10 && !!bankCode,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
}

interface BankDetailsInput {
  bankCode: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

export interface UserStats {
  tournamentsPlayed: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  totalPrizeWon: string;
  // Duel record (optional — populated when backend exposes it)
  duelsPlayed?: number;
  duelsWon?: number;
  duelsLost?: number;
  duelsTied?: number;
  currentWinStreak?: number;
  bestWinStreak?: number;
  fastestAnswerMs?: number;
  // Progression (optional — populated when backend ships the aggregate)
  level?: number;
  xpIntoLevel?: number;
  nextLevelAt?: number;
  lifetimeXp?: number;         // cumulative XP across all time
  seasonRank?: string;
  seasonPoints?: number;
  nextRankAt?: number;
  seasonRankFloor?: number;
  // BE gap: allTimeHighestRank persistence is on the backend punch list
  allTimeHighestRank?: string;
}

export function useUserStats(): UseQueryResult<UserStats> {
  const token = useAuthStore((s) => s.token);
  return useQuery<UserStats>({
    queryKey: ['user', 'stats'],
    queryFn: () => api.get('/users/me/stats').then((r) => r.data),
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateBankDetails() {
  const updateUser = useAuthStore((s) => s.updateUser);

  return useMutation({
    mutationFn: (data: BankDetailsInput) =>
      api.patch('/users/me/bank-details', data).then((r) => r.data),
    onSuccess: (_, variables) => {
      updateUser(variables);
      toast.success('Bank details saved');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to save bank details')),
  });
}
