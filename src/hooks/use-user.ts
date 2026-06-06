import { useMutation, useQuery } from '@tanstack/react-query';
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
