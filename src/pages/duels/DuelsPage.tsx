import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DUEL_MODE_CONFIG, type DuelHistoryItem } from '@/types/duel.types';
import { useDuelHistory } from '@/hooks/use-duels';
import { useAuthStore } from '@/stores/auth.store';
import { ARENA_CONFIG } from '@/lib/arena-config';
import { cn } from '@/lib/utils';

export function DuelsPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const myId = useAuthStore((s) => s.user?.id);
  const { data: history, isLoading: historyLoading } = useDuelHistory();

  const handleDuelClick = (item: DuelHistoryItem) => {
    if (item.status === 'active') {
      navigate(`/duels/${item.id}/play`);
    } else if (item.status === 'pending') {
      navigate(`/duels/${item.code}/waiting`);
    } else {
      navigate(`/duels/${item.id}/result`);
    }
  };

  const handleJoin = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    navigate(`/duels/${trimmed}`);
  };

  return (
    <div className="flex flex-col min-h-full bg-arena-bg">
      <PageHeader
        title="Duels"
        action={
          <Link
            to="/duels/create"
            className="flex items-center gap-1.5 rounded-lg bg-arena-gold px-3 py-1.5 text-sm font-semibold text-black"
          >
            <Plus className="h-4 w-4" />
            New
          </Link>
        }
      />

      <div className="px-4 space-y-6 pb-4">
        {/* Join by code */}
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter duel code"
            maxLength={8}
            className="bg-arena-surface border-arena-border text-white placeholder:text-white/30 font-mono tracking-wider"
          />
          <Button
            onClick={handleJoin}
            disabled={!code.trim()}
            className="bg-arena-gold hover:bg-arena-gold/90 text-black font-semibold shrink-0"
          >
            Join
          </Button>
        </div>

        {/* Duel history */}
        <section>
          <p className="text-white/50 text-sm font-medium uppercase tracking-wider mb-3">
            Recent duels
          </p>
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : !history?.data?.length ? (
            <EmptyState icon="⚔️" title="No duels yet" description="Challenge someone to get started" />
          ) : (
            <div className="space-y-2">
              {history.data.map((item) => {
                const arena = ARENA_CONFIG[item.arena];
                const amChallenger = item.challengerId === myId;
                const myScore = amChallenger ? item.challengerScore : item.opponentScore;
                const theirScore = amChallenger ? item.opponentScore : item.challengerScore;

                // Prefer username fields if the backend adds them later; fall back to truncated ID
                const opponentName =
                  (amChallenger ? item.opponentUsername : item.challengerUsername) ??
                  (amChallenger ? item.opponentId : item.challengerId)?.slice(0, 8) ??
                  'Unknown';

                const outcome = item.isTie
                  ? 'tie'
                  : item.winnerId === myId
                    ? 'win'
                    : item.winnerId !== null
                      ? 'loss'
                      : null;

                const outcomeLabel =
                  outcome === 'win'
                    ? 'Win'
                    : outcome === 'loss'
                      ? 'Loss'
                      : outcome === 'tie'
                        ? 'Tie'
                        : item.status === 'pending' || item.status === 'active'
                          ? 'Ongoing'
                          : '—';

                const outcomeColor =
                  outcome === 'win'
                    ? 'text-arena-green'
                    : outcome === 'loss'
                      ? 'text-arena-red'
                      : 'text-white/60';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleDuelClick(item)}
                    className="flex items-center gap-3 rounded-xl border border-arena-border bg-arena-surface px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <span className="text-xl shrink-0">{arena?.icon ?? '🎮'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        vs {opponentName}
                      </p>
                      <p className="text-white/40 text-xs">
                        {DUEL_MODE_CONFIG[item.mode].label}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn('text-sm font-semibold', outcomeColor)}>{outcomeLabel}</p>
                      <p className="text-white/40 text-xs">{myScore} – {theirScore}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
