import { useParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { useTournamentLeaderboard, useTournament } from '@/hooks/use-tournaments';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function TournamentLeaderboardPage() {
  const { id } = useParams<{ id: string }>();
  const { data: tournament } = useTournament(id!);
  const { data: entries, isLoading } = useTournamentLeaderboard(id!);

  return (
    <div className="flex flex-col min-h-full bg-arena-bg">
      <PageHeader title={tournament?.title ?? 'Leaderboard'} showBack />

      {isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {!isLoading && (!entries || entries.length === 0) && (
        <EmptyState title="No results yet" description="Scores appear once the tournament ends" icon={<Trophy />} />
      )}

      {!isLoading && entries && entries.length > 0 && (
        <div className="px-4 py-2 space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.userId}
              className="flex items-center gap-3 rounded-xl bg-arena-surface border border-arena-border p-3"
            >
              <span
                className="w-6 text-center text-sm font-bold font-display tabular-nums"
                style={{ color: entry.rank === 1 ? '#F5A623' : entry.rank === 2 ? 'rgba(255,255,255,0.55)' : entry.rank === 3 ? '#C9774A' : '#76767F' }}
              >
                {entry.rank <= 3 ? entry.rank : `#${entry.rank}`}
              </span>

              <Avatar className="h-8 w-8">
                <AvatarImage src={entry.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-arena-border text-white text-xs">
                  {entry.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <span className="flex-1 text-white text-sm font-medium">{entry.username}</span>

              <div className="text-right">
                <p className="text-white font-semibold text-sm">{entry.score} pts</p>
                {entry.prizeWon && (
                  <p className="text-arena-gold text-xs">₦{Number(entry.prizeWon).toLocaleString()}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
