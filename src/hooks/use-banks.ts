import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Bank {
  code: string;
  name: string;
}

export function useBanks() {
  return useQuery<Bank[]>({
    queryKey: ['banks'],
    queryFn: () => api.get('/banks').then((r) => r.data.banks),
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });
}
