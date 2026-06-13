import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DUEL_MODE_CONFIG, type DuelMode, type Duel } from '@/types/duel.types';
import { useCreateDuel, useMatchmake } from '@/hooks/use-duels';
import { ARENA_CONFIG } from '@/lib/arena-config';
import type { TournamentArena } from '@/types/tournament.types';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3 | 4;

const STAKES = [
  { label: 'Free', value: 0 },
  { label: '₦100', value: 100 },
  { label: '₦200', value: 200 },
  { label: '₦500', value: 500 },
  { label: '₦1,000', value: 1000 },
];

const ARENAS = Object.entries(ARENA_CONFIG) as [TournamentArena, (typeof ARENA_CONFIG)[TournamentArena]][];
const MODES = Object.entries(DUEL_MODE_CONFIG) as [DuelMode, (typeof DUEL_MODE_CONFIG)[DuelMode]][];

const STEP_TITLES: Record<Step, string> = {
  1: 'Choose mode',
  2: 'Choose arena',
  3: 'Set stake',
  4: 'Challenge type',
};

export function CreateDuelPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateMode = location.state?.mode as DuelMode | undefined;

  const [step, setStep] = useState<Step>(stateMode ? 2 : 1);
  const [selectedMode, setSelectedMode] = useState<DuelMode | null>(stateMode ?? null);
  const [selectedArena, setSelectedArena] = useState<TournamentArena | null>(null);
  const [selectedStake, setSelectedStake] = useState(0);
  const [createdDuel, setCreatedDuel] = useState<Duel | null>(null);

  const createDuel = useCreateDuel();
  const matchmake = useMatchmake();

  useEffect(() => {
    if (stateMode) {
      setSelectedMode(stateMode);
      setStep(2);
    }
  }, [stateMode]);

  const handleBack = () => {
    if (step === 1) {
      navigate(-1);
    } else {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  const handleModeSelect = (mode: DuelMode) => {
    setSelectedMode(mode);
    setStep(2);
  };

  const handleArenaSelect = (arena: TournamentArena) => {
    setSelectedArena(arena);
    setStep(3);
  };

  const handleCreatePrivate = () => {
    if (!selectedMode || !selectedArena) return;
    createDuel.mutate(
      { mode: selectedMode, arena: selectedArena, stake: selectedStake },
      {
        onSuccess: (duel) => {
          setCreatedDuel(duel);
        },
      },
    );
  };

  const handleMatchmake = () => {
    if (!selectedMode || !selectedArena) return;
    matchmake.mutate(
      { mode: selectedMode, arena: selectedArena, stake: selectedStake },
      {
        onSuccess: (duel) => {
          navigate(`/duels/${duel.code}/waiting`, { state: { duel } });
        },
      },
    );
  };

  const handleShare = async (duel: Duel) => {
    const url = `${window.location.origin}/duels/${duel.code}`;
    const text = `I'm challenging you to a duel on Arena! Use code ${duel.code} or tap: ${url}`;
    if (navigator.share) {
      await navigator.share({ title: 'Arena Duel Challenge', text });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  const handleGoWaiting = () => {
    if (!createdDuel) return;
    navigate(`/duels/${createdDuel.code}/waiting`, { state: { duel: createdDuel } });
  };

  return (
    <div className="flex flex-col min-h-svh bg-arena-bg">
      <header className="flex items-center gap-3 px-4 py-4 pt-safe-top border-b border-arena-border">
        <button
          onClick={handleBack}
          className="p-1.5 -ml-1.5 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 font-display text-lg font-semibold text-white">{STEP_TITLES[step]}</h1>
      </header>

      {/* Step indicator */}
      {!createdDuel && (
        <div className="flex justify-center gap-2 py-4">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div
              key={s}
              className={cn(
                'h-1 rounded-full transition-all',
                s < step ? 'w-6 bg-arena-purple/60' : s === step ? 'w-8 bg-arena-purple-bright' : 'w-6 bg-white/10',
              )}
            />
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {/* Created duel — show code */}
        {createdDuel ? (
          <div className="space-y-5 pt-4 animate-slide-up">
            <div className="rounded-2xl border border-arena-border bg-arena-surface p-6 text-center space-y-4">
              <p className="text-white/40 text-xs uppercase tracking-wider">Your duel code</p>
              <p className="font-mono text-5xl font-bold text-arena-gold tracking-widest">
                {createdDuel.code}
              </p>
              <p className="text-white/50 text-sm">Share this with your opponent</p>

              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => handleCopyCode(createdDuel.code)}
                  className="flex items-center gap-2 rounded-xl border border-arena-border px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  Copy code
                </button>
                <button
                  onClick={() => handleShare(createdDuel)}
                  className="flex items-center gap-2 rounded-xl border border-arena-border px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                  Share link
                </button>
              </div>
            </div>

            <Button
              onClick={handleGoWaiting}
              className="w-full h-12 bg-arena-purple hover:bg-arena-purple-bright text-white font-semibold transition-colors"
            >
              Wait for opponent
            </Button>

            <button
              onClick={handleMatchmake}
              disabled={matchmake.isPending}
              className="w-full text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Or find a random opponent instead
            </button>
          </div>
        ) : step === 1 ? (
          /* Mode selection */
          <div className="grid grid-cols-1 gap-3">
            {MODES.map(([mode, config]) => (
              <button
                key={mode}
                onClick={() => handleModeSelect(mode)}
                className={cn(
                  'flex items-center gap-4 rounded-2xl border p-4 text-left transition-all',
                  selectedMode === mode
                    ? 'border-arena-purple bg-arena-purple/10 ring-1 ring-arena-purple/30'
                    : 'border-arena-border bg-arena-surface hover:border-white/15 hover:bg-arena-elev',
                )}
              >
                <span className="text-3xl shrink-0">{config.icon}</span>
                <div className="flex-1">
                  <p className="text-white font-semibold font-display">{config.label}</p>
                  <p className="text-white/50 text-sm mt-0.5">{config.description}</p>
                </div>
                {config.timerSeconds !== null && (
                  <span className="shrink-0 rounded-full bg-arena-purple/10 border border-arena-purple/20 px-2 py-0.5 text-xs text-arena-purple-bright">
                    {config.timerSeconds}s
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : step === 2 ? (
          /* Arena selection */
          <div className="grid grid-cols-2 gap-3">
            {ARENAS.map(([arena, config]) => (
              <button
                key={arena}
                onClick={() => handleArenaSelect(arena)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all',
                  selectedArena === arena
                    ? 'border-arena-purple bg-arena-purple/10 ring-1 ring-arena-purple/30'
                    : 'border-arena-border bg-arena-surface hover:border-white/15 hover:bg-arena-elev',
                )}
              >
                <span className="text-3xl">{config.icon}</span>
                <p className="text-white text-sm font-medium text-center leading-tight font-display">
                  {config.label}
                </p>
              </button>
            ))}
          </div>
        ) : step === 3 ? (
          /* Stake selection */
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              {STAKES.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setSelectedStake(value)}
                  className={cn(
                    'w-full rounded-xl border p-4 text-left font-semibold transition-all',
                    selectedStake === value
                      ? 'border-arena-purple bg-arena-purple/10 text-white ring-1 ring-arena-purple/30'
                      : 'border-arena-border bg-arena-surface text-white/60 hover:border-white/15 hover:bg-arena-elev',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <Button
              onClick={() => setStep(4)}
              className="w-full h-12 bg-arena-purple hover:bg-arena-purple-bright text-white font-semibold mt-4 transition-colors"
            >
              Continue
            </Button>
          </div>
        ) : (
          /* Challenge type */
          <div className="space-y-4">
            <button
              onClick={handleCreatePrivate}
              disabled={createDuel.isPending}
              className="w-full flex flex-col items-start gap-2 rounded-2xl border border-arena-border bg-arena-surface p-5 text-left hover:border-white/15 hover:bg-arena-elev transition-all"
            >
              <span className="text-2xl">🔗</span>
              <p className="text-white font-semibold font-display">Challenge a friend</p>
              <p className="text-white/50 text-sm">
                Get a shareable code to send to a specific person.
              </p>
            </button>

            <button
              onClick={handleMatchmake}
              disabled={matchmake.isPending}
              className="w-full flex flex-col items-start gap-2 rounded-2xl border border-arena-border bg-arena-surface p-5 text-left hover:border-white/15 hover:bg-arena-elev transition-all"
            >
              <span className="text-2xl">🎲</span>
              <p className="text-white font-semibold font-display">Find a random opponent</p>
              <p className="text-white/50 text-sm">
                We'll match you with someone at the same stake level.
              </p>
            </button>

            {(createDuel.isPending || matchmake.isPending) && (
              <div className="flex justify-center pt-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-arena-purple border-t-transparent" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
