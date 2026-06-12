import { Outlet, NavLink, Link } from 'react-router-dom';
import { Home, Swords, Trophy, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ to, icon, label }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-1 px-4 py-2 text-xs transition-colors',
          isActive ? 'text-arena-gold' : 'text-white/50 hover:text-white/80',
        )
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

export function RootLayout() {
  const user = useAuthStore((s) => s.user);
  const initials = user?.username?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <div className="flex flex-col min-h-svh bg-arena-bg">
      <header className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-arena-surface/95 backdrop-blur-sm border-b border-arena-border safe-area-top">
        <span className="text-arena-gold font-black text-lg tracking-tight">Arena</span>
        <Link to="/profile" className="flex items-center gap-2.5">
          <span className="text-white/70 text-sm">{user?.username}</span>
          <div className="h-8 w-8 rounded-full bg-arena-gold/20 border border-arena-gold/40 flex items-center justify-center text-xs font-bold text-arena-gold">
            {initials}
          </div>
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto pt-14 pb-16">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-arena-border bg-arena-surface/95 backdrop-blur-sm safe-area-bottom">
        <NavItem to="/" icon={<Home className="h-5 w-5" />} label="Home" />
        <NavItem to="/duels" icon={<Swords className="h-5 w-5" />} label="Duels" />
        <NavItem to="/leaderboard" icon={<Trophy className="h-5 w-5" />} label="Leaders" />
        <NavItem to="/profile" icon={<User className="h-5 w-5" />} label="Profile" />
      </nav>
    </div>
  );
}
