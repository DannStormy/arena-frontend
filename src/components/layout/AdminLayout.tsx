import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Trophy, BookOpen, Flag, Banknote, TrendingUp, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}

function SidebarLink({ to, icon, label, end }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-arena-gold/10 text-arena-gold'
            : 'text-white/60 hover:bg-white/5 hover:text-white',
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

export function AdminLayout() {
  return (
    <div className="flex min-h-svh bg-arena-bg">
      <aside className="w-56 shrink-0 border-r border-arena-border bg-arena-surface flex flex-col">
        <div className="px-4 py-5 border-b border-arena-border">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Admin Panel</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <SidebarLink to="/admin" end icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
          <SidebarLink to="/admin/tournaments" icon={<Trophy className="h-4 w-4" />} label="Tournaments" />
          <SidebarLink to="/admin/questions" icon={<BookOpen className="h-4 w-4" />} label="Questions" />
          <SidebarLink to="/admin/flagged" icon={<Flag className="h-4 w-4" />} label="Flagged Sessions" />
          <SidebarLink to="/admin/payouts" icon={<Banknote className="h-4 w-4" />} label="Payouts" />
          <SidebarLink to="/admin/progression" icon={<TrendingUp className="h-4 w-4" />} label="Progression" />
        </nav>

        <div className="px-3 py-4 border-t border-arena-border">
          <NavLink
            to="/"
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors px-3 py-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to app
          </NavLink>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
