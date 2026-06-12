import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse
} from '@/types/auth.types';

export function useAuth() {
  const navigate = useNavigate();
  const { setAuth, clearAuth } = useAuthStore();

  const login = async (data: LoginRequest, redirectTo?: string) => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    setAuth(response.data.accessToken, response.data.user);
    navigate(redirectTo ?? '/');
  };

  const register = async (data: RegisterRequest, redirectTo?: string) => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    setAuth(response.data.accessToken, response.data.user);
    navigate(redirectTo ?? '/');
  };

  const logout = () => {
    clearAuth();
    navigate('/login');
  };

  return { login, register, logout };
}
