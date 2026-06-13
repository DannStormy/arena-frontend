import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Copy, Share2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useDuelSocket } from '@/hooks/use-duel-socket';
import { useDuelByCode } from '@/hooks/use-duels';
import { DUEL_MODE_CONFIG, type Duel, type DuelReadyPayload } from '@/types/duel.types';
import { ARENA_CONFIG } from '@/lib/arena-config';

export function DuelWaitingPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const duelFromState = location.state?.duel as Duel | undefined;

  const [activeDuel, setActiveDuel] = useState<Duel | undefined>(duelFromState);
  const [navigating, setNavigating] = useState(false);

  const goToGame = (duel: Duel) => {
    if (navigating) return;
    setNavigating(true);
    toast.success('Opponent found!');
    setTimeout(() => {
      navigate(`/duels/${duel.id}/play`, { state: { duel } });
    }, 1200);
  };

  useDuelSocket(activeDuel?.id ?? null, {
    onDuelReady: (payload: DuelReadyPayload) => {
      if (activeDuel) goToGame(activeDuel);
      else {
        navigate(`/duels/${payload.duelId}/play`);
      }
    },
  });

  // Always poll as a socket fallback — stops once we start navigating
  const { data: duelFromQuery } = useDuelByCode(code ?? '', {
    refetchInterval: navigating ? false : 3000,
  });

  useEffect(() => {
    if (!activeDuel && duelFromQuery) {
      setActiveDuel(duelFromQuery);
    }
  }, [activeDuel, duelFromQuery]);

  // Polling fallback: if socket missed the event, detect via REST
  useEffect(() => {
    if (duelFromQuery?.status === 'active' && !navigating) {
      goToGame(duelFromQuery);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duelFromQuery?.status]);

  const handleCopyCode = async () => {
    if (!activeDuel?.code) return;
    await navigator.clipboard.writeText(activeDuel.code);
    toast.success('Code copied!');
  };

  const handleShare = async () => {
    if (!activeDuel?.code) return;
    const url = `${window.location.origin}/duels/${activeDuel.code}`;
    const text = `I'm challenging you to a duel on Arena! Use code ${activeDuel.code} or tap: ${url}`;
    if (navigator.share) {
      await navigator.share({ title: 'Arena Duel Challenge', text });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  const handleCancel = () => {
    navigate('/duels');
  };

  if (!activeDuel) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-arena-bg">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const modeConfig = DUEL_MODE_CONFIG[activeDuel.mode];
  const arenaConfig = ARENA_CONFIG[activeDuel.arena];

  return (
    <div className="flex flex-col min-h-svh bg-arena-bg px-4 pt-safe-top">
      {/* Header */}
      <div className="flex items-center justify-between py-4 border-b border-arena-border">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{modeConfig.icon}</span>
          <div>
            <p className="text-white font-semibold font-display">{modeConfig.label}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm">{arenaConfig?.icon}</span>
              <p className="text-white/40 text-xs">{arenaConfig?.label}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleCancel}
          className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        {/* Duel code */}
        <div className="rounded-2xl border border-arena-border bg-arena-surface p-6 w-full text-center space-y-3">
          <p className="text-white/40 text-xs uppercase tracking-wider">Duel code</p>
          <p className="font-mono text-4xl font-bold text-arena-gold tracking-widest">
            {activeDuel.code}
          </p>
          <p className="text-white/40 text-sm">Share with your opponent to start</p>

          <div className="flex gap-2 justify-center pt-1">
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 rounded-xl border border-arena-border px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-xl border border-arena-border px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
          </div>
        </div>

        {/* Waiting animation */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-20 w-20 rounded-full bg-arena-purple/20 animate-ping-slow" />
            <span className="absolute inline-flex h-16 w-16 rounded-full bg-arena-purple/10 animate-ping-slow [animation-delay:0.5s]" />
            <div className="relative h-14 w-14 rounded-full bg-arena-elev ring-2 ring-arena-purple/40 flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-white/60 text-sm">Waiting for opponent</p>
            <span className="inline-flex gap-0.5">
              <span className="h-1 w-1 rounded-full bg-arena-purple-bright/60 animate-bounce [animation-delay:0ms]" />
              <span className="h-1 w-1 rounded-full bg-arena-purple-bright/60 animate-bounce [animation-delay:150ms]" />
              <span className="h-1 w-1 rounded-full bg-arena-purple-bright/60 animate-bounce [animation-delay:300ms]" />
            </span>
          </div>
          {activeDuel.stake !== '0' && (
            <div className="rounded-full bg-arena-gold/10 border border-arena-gold/30 px-4 py-1.5">
              <p className="text-arena-gold text-sm font-semibold">₦{activeDuel.stake} stake</p>
            </div>
          )}
        </div>
      </div>

      {/* Cancel */}
      <div className="pb-safe-bottom pb-6">
        <Button
          onClick={handleCancel}
          variant="outline"
          className="w-full border-arena-border text-white/40 hover:text-white hover:border-arena-border/60"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
