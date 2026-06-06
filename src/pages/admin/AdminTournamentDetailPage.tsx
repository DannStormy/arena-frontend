import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAdminTournament } from '@/hooks/use-admin';
import { ARENA_CONFIG } from '@/lib/arena-config';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-arena-gold/10 text-arena-gold',
  active: 'bg-green-400/10 text-green-400',
  completed: 'bg-white/10 text-white/60',
  cancelled: 'bg-arena-red/10 text-arena-red',
};

export function AdminTournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tournament, isLoading: tLoading, error: tError } = useAdminTournament(id!);

  if (tLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (tError || !tournament) {
    return (
      <div className="p-6">
        <ErrorMessage message="Failed to load tournament." />
      </div>
    );
  }

  const arena = ARENA_CONFIG[tournament.arena as keyof typeof ARENA_CONFIG];

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => navigate('/admin/tournaments')}
        className="flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Tournaments
      </button>

      <div className="rounded-xl bg-arena-surface border border-arena-border p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-white text-xl font-bold">{tournament.title}</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {arena ? `${arena.icon} ${arena.label}` : tournament.arena} · {tournament.gameType.replace('_', ' ')}
            </p>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[tournament.status] ?? 'bg-white/10 text-white/60'}`}
          >
            {tournament.status}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-arena-border">
          <div>
            <p className="text-white/40 text-xs">Entry fee</p>
            <p className="text-white font-semibold">₦{Number(tournament.entryFee).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs">1st prize</p>
            <p className="text-white font-semibold">₦{Number(tournament.prizeFirst).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Players</p>
            <p className="text-white font-semibold">{tournament.playerCount}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Min / Max</p>
            <p className="text-white font-semibold">
              {tournament.minPlayers} / {tournament.maxPlayers ?? '∞'}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-white font-semibold mb-3">Entries</h2>

        {(!tournament.entries || tournament.entries.length === 0) && (
          <p className="text-white/40 text-sm text-center py-8">No entries yet.</p>
        )}

        {tournament.entries && tournament.entries.length > 0 && (
          <div className="rounded-xl border border-arena-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-arena-border bg-arena-surface">
                  <th className="text-left text-white/50 font-medium px-4 py-3">Rank</th>
                  <th className="text-left text-white/50 font-medium px-4 py-3">User</th>
                  <th className="text-left text-white/50 font-medium px-4 py-3">Score</th>
                  <th className="text-left text-white/50 font-medium px-4 py-3">Prize Won</th>
                  <th className="text-left text-white/50 font-medium px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {tournament.entries!.map((entry) => (
                  <tr key={entry.id} className="border-b border-arena-border/50 last:border-0">
                    <td className="px-4 py-3 text-white/70">{entry.rank ?? '—'}</td>
                    <td className="px-4 py-3 text-white font-medium">{entry.username}</td>
                    <td className="px-4 py-3 text-white/70">{entry.score}</td>
                    <td className="px-4 py-3 text-white/70">
                      {entry.prizeWon != null ? `₦${Number(entry.prizeWon).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white/50 capitalize text-xs">{entry.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
