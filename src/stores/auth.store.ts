import { create } from 'zustand';
import type { User } from '@/types/auth.types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  setAuth: (token: string, user: User) => void;
  updateUser: (partial: Partial<User>) => void;
  clearAuth: () => void;
  setHydrating: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('arena_token'),
  user: null,
  isAuthenticated: !!localStorage.getItem('arena_token'),
  isHydrating: !!localStorage.getItem('arena_token'),

  setAuth: (token, user) => {
    localStorage.setItem('arena_token', token);
    set({ token, user, isAuthenticated: true });
  },

  updateUser: (partial) =>
    set((s) => ({ user: s.user ? { ...s.user, ...partial } : s.user })),

  clearAuth: () => {
    localStorage.removeItem('arena_token');
    set({ token: null, user: null, isAuthenticated: false });
  },

  setHydrating: (val) => set({ isHydrating: val }),
}));
