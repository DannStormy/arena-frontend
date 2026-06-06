import { Users, Trophy, Flag, Banknote } from 'lucide-react';
import { useAdminStats } from '@/hooks/use-admin';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
  iconColor: string;
}

function StatCard({ icon, label, value, iconColor }: StatCardProps) {
  return (
    <div className="rounded-xl bg-arena-surface border border-arena-border p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${iconColor}`}>{icon}</div>
      <div>
        <p className="text-white/50 text-sm">{label}</p>
        <p className="text-white text-2xl font-bold">
          {value === undefined ? '—' : value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const { data: stats, isLoading } = useAdminStats();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-white text-xl font-bold">Dashboard</h1>
        <p className="text-white/40 text-sm mt-0.5">Platform overview</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            icon={<Users className="h-5 w-5 text-blue-400" />}
            label="Total Users"
            value={stats?.totalUsers}
            iconColor="bg-blue-400/10"
          />
          <StatCard
            icon={<Trophy className="h-5 w-5 text-arena-gold" />}
            label="Active Tournaments"
            value={stats?.activeTournaments}
            iconColor="bg-arena-gold/10"
          />
          <StatCard
            icon={<Flag className="h-5 w-5 text-arena-red" />}
            label="Flagged Sessions"
            value={stats?.flaggedSessions}
            iconColor="bg-arena-red/10"
          />
          <StatCard
            icon={<Banknote className="h-5 w-5 text-green-400" />}
            label="Pending Payouts"
            value={stats?.pendingPayouts}
            iconColor="bg-green-400/10"
          />
        </div>
      )}
    </div>
  );
}
