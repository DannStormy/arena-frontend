import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Copy, Share2, X, User } from 'lucide-react';
import { ModeIcon } from '@/components/common/ModeIcon';
import { ArenaIcon } from '@/lib/arena-icons';
import { EMBER } from '@/lib/ember';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useDuelSocket } from '@/hooks/use-duel-socket';
import { useDuelByCode } from '@/hooks/use-duels';
import { DUEL_MODE_CONFIG, type Duel, type DuelReadyPayload } from '@/types/duel.types';
import { ARENA_CONFIG } from '@/lib/arena-config';

export function DuelWaitingPage() {
  const { code }     = useParams<{ code: string }>();
  const navigate     = useNavigate();
  const location     = useLocation();
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
      else navigate(`/duels/${payload.duelId}/play`);
    },
  });

  // Always poll as a socket fallback — stops once we start navigating
  const { data: duelFromQuery } = useDuelByCode(code ?? '', {
    refetchInterval: navigating ? false : 3000,
  });

  useEffect(() => {
    if (!activeDuel && duelFromQuery) setActiveDuel(duelFromQuery);
  }, [activeDuel, duelFromQuery]);

  // Polling fallback: if socket missed the event, detect via REST
  useEffect(() => {
    if (duelFromQuery?.status === 'active' && !navigating) goToGame(duelFromQuery);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duelFromQuery?.status]);

  const handleCopyCode = async () => {
    if (!activeDuel?.code) return;
    await navigator.clipboard.writeText(activeDuel.code);
    toast.success('Code copied!');
  };

  const handleShare = async () => {
    if (!activeDuel?.code) return;
    const url  = `${window.location.origin}/duels/${activeDuel.code}`;
    const text = `I'm challenging you to a duel on Arena! Use code ${activeDuel.code} or tap: ${url}`;
    if (navigator.share) await navigator.share({ title: 'Arena Duel Challenge', text });
    else { await navigator.clipboard.writeText(url); toast.success('Link copied!'); }
  };

  const handleCancel = () => navigate('/duels');

  if (!activeDuel) {
    return (
      <div className="flex min-h-svh items-center justify-center" style={{ background: EMBER.base }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const modeConfig  = DUEL_MODE_CONFIG[activeDuel.mode];
  const arenaConfig = ARENA_CONFIG[activeDuel.arena];

  return (
    <div
      className="flex flex-col min-h-svh px-4 pt-safe-top"
      style={{ background: EMBER.base }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between py-4"
        style={{ borderBottom: `1px solid ${EMBER.border}` }}
      >
        <div className="flex items-center gap-3">
          <ModeIcon mode={activeDuel.mode} size={28} iconSize={14} clip />
          <div>
            <p className="font-display font-semibold" style={{ color: EMBER.textPrimary }}>
              {modeConfig.label}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <ArenaIcon arena={activeDuel.arena} size={13} />
              <p className="text-xs" style={{ color: EMBER.textTertiary }}>
                {arenaConfig?.label}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleCancel}
          className="p-2 transition-colors"
          style={{ color: EMBER.textTertiary }}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8">

        {/* Duel code card */}
        <div className="clip-card p-6 w-full text-center space-y-3" style={{ background: EMBER.surface }}>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.09em]"
            style={{ color: EMBER.textTertiary }}
          >
            Duel code
          </p>
          <p
            className="font-display font-black text-4xl tabular-nums tracking-widest"
            style={{ color: EMBER.accentBright }}
          >
            {activeDuel.code}
          </p>
          <p className="text-sm" style={{ color: EMBER.textTertiary }}>
            Share with your opponent to start
          </p>

          <div className="flex gap-2 justify-center pt-1">
            <button
              onClick={handleCopyCode}
              className="clip-chip flex items-center gap-1.5 px-3 py-2 text-xs transition-colors"
              style={{
                color:      EMBER.textSecondary,
                background: 'rgba(255,255,255,0.05)',
                boxShadow:  'inset 0 0 0 1px rgba(255,255,255,0.10)',
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
            <button
              onClick={handleShare}
              className="clip-chip flex items-center gap-1.5 px-3 py-2 text-xs transition-colors"
              style={{
                color:      EMBER.textSecondary,
                background: 'rgba(255,255,255,0.05)',
                boxShadow:  'inset 0 0 0 1px rgba(255,255,255,0.10)',
              }}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
          </div>
        </div>

        {/* Waiting animation */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
            <span
              className="absolute inline-flex h-20 w-20 rounded-full animate-ping-slow"
              style={{ background: 'rgba(232,137,59,0.18)' }}
            />
            <span
              className="absolute inline-flex h-16 w-16 rounded-full animate-ping-slow [animation-delay:0.5s]"
              style={{ background: 'rgba(232,137,59,0.10)' }}
            />
            <div
              className="relative h-14 w-14 rounded-full flex items-center justify-center"
              style={{
                background: EMBER.surface,
                boxShadow:  'inset 0 0 0 2px rgba(232,137,59,0.40)',
              }}
            >
              <User className="h-6 w-6" style={{ color: EMBER.textTertiary }} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-sm" style={{ color: EMBER.textSecondary }}>
              Waiting for opponent
            </p>
            <span className="inline-flex gap-0.5">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="h-1 w-1 rounded-full animate-bounce"
                  style={{ background: 'rgba(232,137,59,0.60)', animationDelay: `${delay}ms` }}
                />
              ))}
            </span>
          </div>
        </div>
      </div>

      {/* ── Cancel ────────────────────────────────────────────────────────── */}
      <div className="pb-safe-bottom pb-6">
        <button
          onClick={handleCancel}
          className="duel-btn-secondary"
          style={{ padding: '12px 16px', fontSize: 13 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
