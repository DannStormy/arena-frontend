import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Skull, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ModeIcon } from '@/components/common/ModeIcon';
import { ArenaIcon } from '@/lib/arena-icons';
import { useDuelByCode, useAcceptDuel } from '@/hooks/use-duels';
import { DUEL_MODE_CONFIG } from '@/types/duel.types';
import { ARENA_CONFIG } from '@/lib/arena-config';

export function JoinDuelPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const { data: duel, isLoading, isError } = useDuelByCode(code ?? '');
  const accept = useAcceptDuel();

  const handleAccept = () => {
    if (!code) return;
    accept.mutate(code, {
      onSuccess: (updatedDuel) => {
        navigate(`/duels/${updatedDuel.id}/play`, { state: { duel: updatedDuel } });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-arena-bg">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !duel) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-arena-bg px-4">
        <EmptyState
          icon={<Skull />}
          title="Challenge not found"
          description="This duel code may have expired or already been used."
        />
        <Button
          onClick={() => navigate('/duels')}
          className="mt-6 bg-arena-gold hover:bg-arena-gold/90 text-black font-semibold"
        >
          Back to Duels
        </Button>
      </div>
    );
  }

  if (duel.status !== 'pending') {
    const message =
      duel.status === 'active' || duel.status === 'completed'
        ? 'This duel is already in progress or completed.'
        : 'This challenge has expired or been cancelled.';
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-arena-bg px-4">
        <EmptyState icon={<Clock />} title="Can't join" description={message} />
        <Button
          onClick={() => navigate('/duels')}
          className="mt-6 bg-arena-gold hover:bg-arena-gold/90 text-black font-semibold"
        >
          Back to Duels
        </Button>
      </div>
    );
  }

  const modeConfig = DUEL_MODE_CONFIG[duel.mode];
  const arenaConfig = ARENA_CONFIG[duel.arena];

  return (
    <div className="flex flex-col min-h-svh bg-arena-bg">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 pt-safe-top">
        <button
          onClick={() => navigate(-1)}
          className="p-1 -ml-1 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-lg font-semibold text-white">Accept Challenge</h1>
      </div>

      <div className="flex-1 px-4 pb-6 space-y-4">
        {/* Challenger card */}
        <div className="rounded-xl border border-arena-border bg-arena-surface p-5 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-16 w-16 rounded-full bg-arena-gold/20 border border-arena-gold/40 flex items-center justify-center text-2xl font-bold text-arena-gold">
              {duel.challengerUsername.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold text-lg">{duel.challengerUsername}</p>
              <p className="text-white/50 text-sm">is challenging you</p>
            </div>
          </div>
        </div>

        {/* Duel details */}
        <div className="rounded-xl border border-arena-border bg-arena-surface divide-y divide-arena-border">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-white/50 text-sm">Mode</span>
            <div className="flex items-center gap-2">
              <ModeIcon mode={duel.mode} size={20} iconSize={11} />
              <span className="text-white text-sm font-medium">{modeConfig.label}</span>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-white/50 text-sm">Arena</span>
            <div className="flex items-center gap-2">
              <ArenaIcon arena={duel.arena} size={13} />
              <span className="text-white text-sm font-medium">{arenaConfig?.label}</span>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-white/50 text-sm">Stake</span>
            <span className="text-white text-sm font-medium">
              {duel.stake === '0' ? 'Free' : `₦${duel.stake}`}
            </span>
          </div>
          {modeConfig.timerSeconds && (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-white/50 text-sm">Time per question</span>
              <span className="text-white text-sm font-medium">{modeConfig.timerSeconds}s</span>
            </div>
          )}
        </div>

        <p className="text-white/40 text-xs text-center px-4">{modeConfig.description}</p>
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-safe-bottom pb-6 space-y-2">
        <Button
          onClick={handleAccept}
          disabled={accept.isPending}
          className="w-full bg-arena-gold hover:bg-arena-gold/90 text-black font-semibold"
        >
          {accept.isPending ? 'Joining...' : 'Accept Challenge'}
        </Button>
        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          className="w-full border-arena-border text-white/50 hover:text-white"
        >
          Decline
        </Button>
      </div>
    </div>
  );
}
