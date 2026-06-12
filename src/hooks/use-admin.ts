import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  activeTournaments: number;
  flaggedSessions: number;
  pendingPayouts: number;
}

export interface AdminTournament {
  id: string;
  title: string;
  arena: string;
  gameType: string;
  status: 'open' | 'active' | 'completed' | 'cancelled';
  entryFee: number | string;
  playerCount: number;
  prizeFirst: number | string;
  prizeSecond?: number | string | null;
  prizeThird?: number | string | null;
  minPlayers: number;
  maxPlayers?: number | null;
  createdAt: string;
  entries?: TournamentEntry[];
}

export interface TournamentEntry {
  id: string;
  userId: string;
  username: string;
  score: number;
  rank: number | null;
  prizeWon: number | null;
  status: string;
}

export interface AdminQuestion {
  id: string;
  content: string;
  options: string[];
  correctAnswer: number;
  category: string;
  arena: string;
  difficulty?: string;
  isActive?: boolean;
}

export interface FlaggedSession {
  id: string;
  userId: string;
  username: string;
  tournamentId: string;
  tournamentTitle: string;
  score: number;
  flagReason: string;
  createdAt: string;
}

export interface ReportedQuestion {
  id: string;
  content: string;
  category: string;
  difficulty?: string;
  isActive?: boolean;
  reportCount: number;
  reports: { reason: string; count: number }[];
}

export interface PendingPayout {
  id: string;
  userId: string;
  username: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  amount: number;
  tournamentTitle: string;
}

export interface CreateTournamentInput {
  title: string;
  arena: string;
  gameType: string;
  entryFee: number;
  prizeFirst: number;
  prizeSecond?: number;
  prizeThird?: number;
  minPlayers: number;
  maxPlayers?: number;
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: queryKeys.admin.stats,
    queryFn: () => api.get('/admin/stats').then((r) => r.data),
  });
}

export function useAdminTournaments() {
  return useQuery<AdminTournament[]>({
    queryKey: queryKeys.admin.tournaments,
    // Backend returns a paginated envelope { data: [], total, ... } — unwrap the array
    queryFn: () => api.get('/admin/tournaments').then((r) => r.data.data ?? r.data),
  });
}

export function useAdminTournament(id: string) {
  return useQuery<AdminTournament>({
    queryKey: queryKeys.admin.tournament(id),
    queryFn: () => api.get(`/admin/tournaments/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useAdminTournamentEntries(id: string) {
  return useQuery<TournamentEntry[]>({
    queryKey: queryKeys.admin.tournamentEntries(id),
    queryFn: () => api.get(`/admin/tournaments/${id}/entries`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTournamentInput) =>
      api.post('/admin/tournaments', data).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.tournaments });
      toast.success('Tournament created');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to create tournament')),
  });
}

export function useChangeTournamentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/tournaments/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.tournaments });
      toast.success('Status updated');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to update status')),
  });
}

export function useAdminQuestions(category?: string) {
  // Keep a ref so the queryFn always reads the current category without it being in the key
  const categoryRef = useRef(category);
  categoryRef.current = category;

  const result = useQuery<AdminQuestion[]>({
    queryKey: queryKeys.admin.questions,
    queryFn: () =>
      api
        .get('/admin/questions', {
          params: categoryRef.current ? { category: categoryRef.current } : undefined,
        })
        .then((r) => {
          // Backend returns paginated envelope { data: [], total, ... }
          if (Array.isArray(r.data?.data)) return r.data.data as AdminQuestion[];
          if (Array.isArray(r.data)) return r.data as AdminQuestion[];
          return [];
        }),
  });

  const { refetch } = result;
  const prevCategoryRef = useRef(category);

  useEffect(() => {
    if (prevCategoryRef.current === category) return;
    prevCategoryRef.current = category;
    void refetch();
  }, [category, refetch]);

  return result;
}

interface UpdateQuestionInput {
  id: string;
  content?: string;
  options?: string[];
  correctAnswer?: number;
  difficulty?: string;
  isActive?: boolean;
}

export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateQuestionInput) =>
      api.patch(`/admin/questions/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'questions'] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to update question')),
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/questions/${id}`).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'questions'] });
      toast.success('Question deleted');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to delete question')),
  });
}

export function useBulkUploadQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questions: Omit<AdminQuestion, 'id'>[]) =>
      api.post('/questions', { questions }).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'questions'] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Bulk upload failed')),
  });
}

export function useAdminReportedQuestions() {
  return useQuery<ReportedQuestion[]>({
    queryKey: queryKeys.admin.reportedQuestions,
    queryFn: () => api.get('/admin/questions/reported').then((r) => r.data.data ?? r.data),
  });
}

export function useAdminFlagged() {
  return useQuery<FlaggedSession[]>({
    queryKey: queryKeys.admin.flagged,
    queryFn: () => api.get('/admin/sessions/flagged').then((r) => r.data.data ?? r.data),
  });
}

export function useClearFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/admin/sessions/${id}/clear`).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.flagged });
      toast.success('Flag cleared');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to clear flag')),
  });
}

export function useDisqualify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/admin/sessions/${id}/disqualify`).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.flagged });
      toast.success('Session disqualified');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to disqualify')),
  });
}

export function useAdminPayouts() {
  return useQuery<PendingPayout[]>({
    queryKey: queryKeys.admin.payouts,
    queryFn: () => api.get('/admin/payouts/pending').then((r) => r.data),
  });
}

export function useTriggerPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/admin/payouts/${id}/trigger`).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.payouts });
      toast.success('Payout triggered');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to trigger payout')),
  });
}
