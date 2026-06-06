import { Outlet, NavLink } from 'react-router-dom';
import { Home, Wallet, Trophy, User } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  return (
    <div className="flex flex-col min-h-svh bg-arena-bg">
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-arena-border bg-arena-surface/95 backdrop-blur-sm safe-area-bottom">
        <NavItem to="/" icon={<Home className="h-5 w-5" />} label="Home" />
        <NavItem to="/wallet" icon={<Wallet className="h-5 w-5" />} label="Wallet" />
        <NavItem to="/leaderboard" icon={<Trophy className="h-5 w-5" />} label="Leaders" />
        <NavItem to="/profile" icon={<User className="h-5 w-5" />} label="Profile" />
      </nav>
    </div>
  );
}
