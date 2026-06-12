import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useDuelByCode, useAcceptDuel } from '@/hooks/use-duels';
import { useAuthStore } from '@/stores/auth.store';
import { DUEL_MODE_CONFIG } from '@/types/duel.types';
import { ARENA_CONFIG } from '@/lib/arena-config';

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function ChallengePreviewPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: duel, isLoading, isError } = useDuelByCode(code ?? '');
  const accept = useAcceptDuel();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!duel?.expiresAt) return;
    const tick = () => {
      const secs = Math.max(0, Math.floor((new Date(duel.expiresAt!).getTime() - Date.now()) / 1000));
      setTimeLeft(secs);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [duel?.expiresAt]);

  const handleAccept = () => {
    if (!code) return;
    accept.mutate(code, {
      onSuccess: (accepted) => {
        navigate(`/duels/${accepted.id}/play`, { state: { duel: accepted } });
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
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-arena-bg px-4">
        <p className="text-5xl">⚔️</p>
        <p className="text-white font-semibold text-lg">Challenge not found</p>
        <p className="text-white/50 text-sm text-center">
          This duel code may have expired or doesn't exist.
        </p>
        <button
          onClick={() => navigate('/')}
          className="text-arena-gold text-sm hover:underline"
        >
          Go to Arena
        </button>
      </div>
    );
  }

  if (duel.status !== 'pending') {
    const msg =
      duel.status === 'active' || duel.status === 'completed'
        ? 'This duel is already in progress or completed.'
        : 'This challenge has expired or been cancelled.';
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-arena-bg px-4">
        <p className="text-5xl">⏱️</p>
        <p className="text-white font-semibold text-lg">Can't join</p>
        <p className="text-white/50 text-sm text-center">{msg}</p>
        <button
          onClick={() => navigate('/')}
          className="text-arena-gold text-sm hover:underline"
        >
          Go to Arena
        </button>
      </div>
    );
  }

  const modeConfig = DUEL_MODE_CONFIG[duel.mode];
  const arenaConfig = ARENA_CONFIG[duel.arena];
  const expired = timeLeft !== null && timeLeft === 0;
  const redirectPath = `/duels/${code}`;

  return (
    <div className="flex flex-col min-h-svh bg-arena-bg px-4 pt-safe-top">
      {/* Header */}
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <span className="text-6xl">{modeConfig.icon}</span>
        <p className="text-white text-2xl font-black mt-2 text-center">
          @{duel.challengerUsername} challenged you!
        </p>
        <p className="text-white/50 text-sm text-center">Join the duel and prove your worth</p>
      </div>

      <div className="space-y-3 flex-1">
        {/* Duel details card */}
        <div className="rounded-xl border border-arena-border bg-arena-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{arenaConfig?.icon}</span>
              <div>
                <p className="text-white font-semibold">{modeConfig.label}</p>
                <p className="text-white/50 text-xs">{arenaConfig?.label}</p>
              </div>
            </div>
            {duel.stake !== '0' && (
              <div className="rounded-full bg-arena-gold/10 border border-arena-gold/30 px-3 py-1">
                <p className="text-arena-gold text-sm font-semibold">₦{duel.stake}</p>
              </div>
            )}
          </div>

          <p className="text-white/60 text-sm">{modeConfig.description}</p>

          {timeLeft !== null && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/40">Expires in</span>
              <span
                className={
                  expired ? 'text-arena-red font-semibold' : 'text-white font-semibold'
                }
              >
                {expired ? 'Expired' : formatCountdown(timeLeft)}
              </span>
            </div>
          )}
        </div>

        {/* Code display */}
        <div className="rounded-xl border border-arena-border bg-arena-surface p-4 text-center">
          <p className="text-white/40 text-xs mb-1">Duel code</p>
          <p className="font-mono text-2xl font-bold text-arena-gold tracking-widest">{code}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="py-6 space-y-3">
        {isAuthenticated ? (
          <Button
            onClick={handleAccept}
            disabled={expired || accept.isPending}
            className="w-full bg-arena-gold hover:bg-arena-gold/90 text-black font-semibold"
          >
            {accept.isPending ? 'Joining…' : 'Accept Challenge'}
          </Button>
        ) : (
          <>
            <Button
              onClick={() =>
                navigate(`/register?redirect=${encodeURIComponent(redirectPath)}`)
              }
              className="w-full bg-arena-gold hover:bg-arena-gold/90 text-black font-semibold"
            >
              Sign up to accept
            </Button>
            <button
              onClick={() =>
                navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`)
              }
              className="w-full flex items-center justify-center rounded-xl border border-arena-border py-3 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              Log in to accept
            </button>
          </>
        )}
        <button
          onClick={() => navigate('/')}
          className="w-full text-center text-sm text-white/40 hover:text-white/70 transition-colors py-2"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
