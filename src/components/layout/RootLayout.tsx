import { Outlet, NavLink, Link } from 'react-router-dom';
import { Home, Swords, Trophy, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useWallet } from '@/hooks/use-wallet';
import { Logo } from '@/components/common/Logo';

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
          'flex flex-col items-center gap-0.5 px-4 py-2 text-xs font-medium transition-colors duration-150',
          isActive ? 'text-arena-purple-bright' : 'text-arena-text-tertiary hover:text-white/60',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'flex items-center justify-center rounded-xl p-1.5 transition-colors duration-150',
              isActive ? 'bg-arena-purple/15' : '',
            )}
          >
            {icon}
          </span>
          <span>{label}</span>
          {isActive && (
            <span className="mt-0.5 h-[2px] w-4 rounded-full bg-arena-purple opacity-80" />
          )}
        </>
      )}
    </NavLink>
  );
}

export function RootLayout() {
  const user = useAuthStore((s) => s.user);
  const initials = user?.username?.slice(0, 2).toUpperCase() ?? '??';
  const { data: wallet } = useWallet();

  const balanceDisplay = wallet?.balance != null
    ? `₦${Number(wallet.balance).toLocaleString()}`
    : null;

  return (
    <div className="flex flex-col min-h-svh bg-arena-bg">
      <header className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-arena-surface/90 backdrop-blur-md border-b border-arena-border safe-area-top">
        <Logo variant="full" />
        <Link to="/profile" className="flex items-center gap-2.5">
          {balanceDisplay && (
            <span className="font-display font-bold text-arena-gold text-sm tabular-nums">
              {balanceDisplay}
            </span>
          )}
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{
              background: '#7C5CFF',
              boxShadow: '0 0 0 1px rgba(142,114,255,0.4)',
            }}
          >
            {initials}
          </div>
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto pt-14 pb-16">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-arena-border bg-arena-surface/90 backdrop-blur-md safe-area-bottom">
        <NavItem to="/" icon={<Home className="h-5 w-5" />} label="Home" />
        <NavItem to="/duels" icon={<Swords className="h-5 w-5" />} label="Duels" />
        <NavItem to="/leaderboard" icon={<Trophy className="h-5 w-5" />} label="Leaders" />
        <NavItem to="/profile" icon={<User className="h-5 w-5" />} label="Profile" />
      </nav>
    </div>
  );
}
