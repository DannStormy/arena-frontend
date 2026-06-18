import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth.store';
import type { WalletSummary, TransactionPage } from '@/types/wallet.types';

export function useWallet() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: queryKeys.wallet.summary,
    queryFn: async () => {
      const response = await api.get<WalletSummary>('/wallet');
      return response.data;
    },
    enabled: !!token,
    // RootLayout + WalletPage both subscribe; staleTime prevents extra fetches
    // from Strict Mode double-mounts and window-focus events.
    staleTime: 30 * 1000,
  });
}

export function useTransactions(page: number) {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: queryKeys.wallet.transactions(page),
    queryFn: async () => {
      const response = await api.get<TransactionPage>('/wallet/transactions', {
        params: { page, pageSize: 20 },
      });
      return response.data;
    },
    enabled: !!token,
  });
}
