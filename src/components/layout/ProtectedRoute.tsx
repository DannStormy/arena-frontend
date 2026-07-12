import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface Props {
  adminOnly?: boolean;
}

export function ProtectedRoute({ adminOnly }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const user = useAuthStore((s) => s.user);

  if (isHydrating) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    // Lead a new/logged-out visitor with the branded sign-up entry (§8),
    // not the returning-user login. Sign-in stays one tap away from there.
    return <Navigate to="/register" replace />;
  }

  if (adminOnly && !user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
