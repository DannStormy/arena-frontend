import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTournament } from '@/hooks/use-tournaments';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { ARENA_CONFIG } from '@/lib/arena-config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tournament, isLoading, error } = useTournament(id!);
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

const handleJoin = async () => {
  if (!id) return;

  setIsJoining(true);
  try {
    await api.post(`/tournaments/${id}/join`);
    setHasJoined(true);
    toast.success('Joined tournament!');
  } catch (err) {
  console.log('err instanceof Error:', err instanceof Error);
  console.log('err?.response:', (err as any)?.response);
  console.log('err?.response?.data:', (err as any)?.response?.data);
  toast.error(getErrorMessage(err, 'Failed to join tournament'));
}finally {
    setIsJoining(false);
  }
};

  const handlePlay = async () => {
    if (!id) return;

    setIsStarting(true);
    try {
      const response = await api.post('/game-sessions', { tournamentId: id });
      navigate(`/game/${response.data.id}`, {
        state: { totalQuestions: response.data.totalQuestions },
      });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to start game'));
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-arena-bg">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="flex min-h-svh flex-col bg-arena-bg">
        <PageHeader title="Tournament" showBack />
        <div className="flex flex-1 items-center justify-center px-4">
          <ErrorMessage message="Could not load tournament details." />
        </div>
      </div>
    );
  }

  const arena = ARENA_CONFIG[tournament.arena];
  const playerCount = tournament.playerCount ?? 0;
  const progressPct = tournament.maxPlayers
    ? Math.min((playerCount / tournament.maxPlayers) * 100, 100)
    : 0;
  const effectivelyJoined = tournament.hasJoined || hasJoined;
  const canJoin = tournament.status === 'open' && !effectivelyJoined;

  return (
    <div className="flex flex-col min-h-full bg-arena-bg">
      <PageHeader title={tournament.title} showBack />

      <div className="px-4 pb-8 space-y-5">
        <div className="flex items-center gap-2">
          <Badge className="text-black font-medium" style={{ backgroundColor: arena.color }}>
            {arena.icon} {arena.label}
          </Badge>
          <Badge variant="outline" className="text-white/70 border-arena-border capitalize">
            {tournament.gameType.replace('_', ' ')}
          </Badge>
        </div>

        <div className="rounded-xl bg-arena-surface border border-arena-border p-4 space-y-3">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Prizes</h2>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-arena-gold font-medium">🥇 1st place</span>
              <span className="text-white font-semibold">₦{Number(tournament.prizeFirst).toLocaleString()}</span>
            </div>

            {tournament.prizeSecond && (
              <div className="flex justify-between text-sm">
                <span className="text-white/60">🥈 2nd place</span>
                <span className="text-white">₦{Number(tournament.prizeSecond).toLocaleString()}</span>
              </div>
            )}

            {tournament.prizeThird && (
              <div className="flex justify-between text-sm">
                <span className="text-white/60">🥉 3rd place</span>
                <span className="text-white">₦{Number(tournament.prizeThird).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-arena-surface border border-arena-border p-4 space-y-3">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Players</h2>

          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/60">
              {playerCount} joined
            </span>
            <span className="text-white/60">
              {tournament.maxPlayers ? `${tournament.maxPlayers} max` : `min ${tournament.minPlayers}`}
            </span>
          </div>

          {tournament.maxPlayers && (
            <Progress value={progressPct} className="h-2" />
          )}
        </div>

        <div className="rounded-xl bg-arena-surface border border-arena-border p-4">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Entry fee</span>
            <span className="text-white font-semibold">₦{Number(tournament.entryFee).toLocaleString()}</span>
          </div>
        </div>

        <div className="pt-2">
          {effectivelyJoined ? (
            <Button
              onClick={handlePlay}
              disabled={isStarting}
              className="w-full bg-arena-gold hover:bg-arena-gold/90 text-black font-semibold h-12 text-base"
            >
              {isStarting ? 'Starting…' : 'Play now'}
            </Button>
          ) : (
            <Button
              onClick={handleJoin}
              disabled={!canJoin || isJoining}
              className="w-full bg-arena-gold hover:bg-arena-gold/90 text-black font-semibold h-12 text-base"
            >
              {isJoining
                ? 'Joining…'
                : tournament.status !== 'open'
                  ? 'Tournament closed'
                  : `Join — ₦${Number(tournament.entryFee).toLocaleString()}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
