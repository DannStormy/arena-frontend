import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { useAuthStore } from './stores/auth.store';
import { api } from './lib/api';

const token = localStorage.getItem('arena_token');
const { setAuth, clearAuth, setHydrating } = useAuthStore.getState();

if (token) {
  api.get('/users/me', { headers: { Authorization: `Bearer ${token}` } })
    .then((res: { data: Parameters<typeof setAuth>[1] }) => setAuth(token, res.data))
    .catch((err: unknown) => {
      const status =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;

      if (status === 401) clearAuth();
    })
    .finally(() => {
      setHydrating(false);
    });
} else {
  setHydrating(false);
}

createRoot(document.getElementById('root')!).render(
  <App />
);
