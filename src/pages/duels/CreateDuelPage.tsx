import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Copy, Share2, Link2, Shuffle } from 'lucide-react';
import { toast } from 'sonner';
import { ModeIcon, getModeAccent } from '@/components/common/ModeIcon';
import { ArenaIcon } from '@/lib/arena-icons';
import { EMBER } from '@/lib/ember';
import { DUEL_MODE_CONFIG, type DuelMode, type Duel } from '@/types/duel.types';
import { useCreateDuel, useMatchmake } from '@/hooks/use-duels';
import { ARENA_CONFIG } from '@/lib/arena-config';
import type { TournamentArena } from '@/types/tournament.types';

type Step = 1 | 2 | 3;

const ARENAS = Object.entries(ARENA_CONFIG) as [TournamentArena, (typeof ARENA_CONFIG)[TournamentArena]][];
const MODES  = Object.entries(DUEL_MODE_CONFIG) as [DuelMode, (typeof DUEL_MODE_CONFIG)[DuelMode]][];

const STEP_TITLES: Record<Step, string> = {
  1: 'Choose mode',
  2: 'Choose arena',
  3: 'Challenge type',
};

// ── Ember selection styles ────────────────────────────────────────────────────

function selectionStyle(selected: boolean): React.CSSProperties {
  return selected
    ? { background: 'rgba(232,137,59,0.10)', boxShadow: 'inset 0 0 0 1.5px rgba(232,137,59,0.75)' }
    : { background: EMBER.surface };
}

export function CreateDuelPage() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const stateMode  = location.state?.mode as DuelMode | undefined;

  const [step, setStep]               = useState<Step>(stateMode ? 2 : 1);
  const [selectedMode, setSelectedMode]   = useState<DuelMode | null>(stateMode ?? null);
  const [selectedArena, setSelectedArena] = useState<TournamentArena | null>(null);
  const [createdDuel, setCreatedDuel]     = useState<Duel | null>(null);

  const createDuel = useCreateDuel();
  const matchmake  = useMatchmake();

  useEffect(() => {
    if (stateMode) {
      setSelectedMode(stateMode);
      setStep(2);
    }
  }, [stateMode]);

  const handleBack = () => {
    if (step === 1) navigate(-1);
    else setStep((prev) => (prev - 1) as Step);
  };

  const handleModeSelect  = (mode: DuelMode) => { setSelectedMode(mode);  setStep(2); };
  const handleArenaSelect = (arena: TournamentArena) => { setSelectedArena(arena); setStep(3); };

  const handleCreatePrivate = () => {
    if (!selectedMode || !selectedArena) return;
    createDuel.mutate(
      { mode: selectedMode, arena: selectedArena },
      { onSuccess: (duel) => setCreatedDuel(duel) },
    );
  };

  const handleMatchmake = () => {
    if (!selectedMode || !selectedArena) return;
    matchmake.mutate(
      { mode: selectedMode, arena: selectedArena },
      { onSuccess: (duel) => navigate(`/duels/${duel.code}/waiting`, { state: { duel } }) },
    );
  };

  const handleShare = async (duel: Duel) => {
    const url  = `${window.location.origin}/duels/${duel.code}`;
    const text = `I'm challenging you to a duel on Arena! Use code ${duel.code} or tap: ${url}`;
    if (navigator.share) await navigator.share({ title: 'Arena Duel Challenge', text });
    else { await navigator.clipboard.writeText(url); toast.success('Link copied!'); }
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  const handleGoWaiting = () => {
    if (!createdDuel) return;
    navigate(`/duels/${createdDuel.code}/waiting`, { state: { duel: createdDuel } });
  };

  const pageTitle = createdDuel ? 'Your duel code' : STEP_TITLES[step];

  return (
    <div className="flex flex-col min-h-svh" style={{ background: EMBER.base }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header
        className="flex items-center gap-3 px-4 py-4 pt-safe-top"
        style={{ borderBottom: `1px solid ${EMBER.border}` }}
      >
        <button
          onClick={handleBack}
          className="p-1.5 -ml-1.5 transition-colors"
          style={{ color: EMBER.textTertiary }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 font-display text-lg font-semibold" style={{ color: EMBER.textPrimary }}>
          {pageTitle}
        </h1>
      </header>

      {/* ── Progress dots ───────────────────────────────────────────────────── */}
      {!createdDuel && (
        <div className="flex justify-center gap-2 py-4">
          {([1, 2, 3] as Step[]).map((s) => (
            <div
              key={s}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width:      s === step ? 32 : 24,
                background: s < step
                  ? 'rgba(232,137,59,0.45)'
                  : s === step
                  ? EMBER.accent
                  : 'rgba(255,255,255,0.10)',
              }}
            />
          ))}
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">

        {/* ── Duel code (after private duel created) ──────────────────────── */}
        {createdDuel ? (
          <div className="space-y-4 pt-4 animate-slide-up">
            <div className="clip-card p-6 text-center space-y-4" style={{ background: EMBER.surface }}>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.09em]"
                style={{ color: EMBER.textTertiary }}
              >
                Your duel code
              </p>
              <p
                className="font-display font-black text-5xl tabular-nums tracking-widest"
                style={{ color: EMBER.accentBright }}
              >
                {createdDuel.code}
              </p>
              <p className="text-sm" style={{ color: EMBER.textTertiary }}>
                Share this with your opponent
              </p>

              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => handleCopyCode(createdDuel.code)}
                  className="clip-chip flex items-center gap-2 px-4 py-2 text-sm transition-colors"
                  style={{
                    color:      EMBER.textSecondary,
                    background: 'rgba(255,255,255,0.05)',
                    boxShadow:  'inset 0 0 0 1px rgba(255,255,255,0.10)',
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Copy code
                </button>
                <button
                  onClick={() => handleShare(createdDuel)}
                  className="clip-chip flex items-center gap-2 px-4 py-2 text-sm transition-colors"
                  style={{
                    color:      EMBER.textSecondary,
                    background: 'rgba(255,255,255,0.05)',
                    boxShadow:  'inset 0 0 0 1px rgba(255,255,255,0.10)',
                  }}
                >
                  <Share2 className="h-4 w-4" />
                  Share link
                </button>
              </div>
            </div>

            {/* Wait for opponent — ember primary, leak-fixed */}
            <div className="duel-btn-wrap is-primary">
              <button
                onClick={handleGoWaiting}
                className="duel-btn-primary"
                style={{ padding: '14px 16px', fontSize: 14 }}
              >
                Wait for opponent
              </button>
            </div>

            <button
              onClick={handleMatchmake}
              disabled={matchmake.isPending}
              className="w-full text-sm transition-colors disabled:opacity-50"
              style={{ color: EMBER.accent }}
            >
              Or find a random opponent instead
            </button>
          </div>

        ) : step === 1 ? (
          /* ── Mode selection ─────────────────────────────────────────────── */
          <div className="grid grid-cols-1 gap-3">
            {MODES.map(([mode, config]) => {
              const accent = getModeAccent(mode);
              return (
                <button
                  key={mode}
                  onClick={() => handleModeSelect(mode)}
                  className="clip-card flex items-center gap-4 p-4 text-left transition-all active:scale-[0.98]"
                  style={selectionStyle(selectedMode === mode)}
                >
                  <ModeIcon mode={mode} size={36} iconSize={18} clip />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold" style={{ color: EMBER.textPrimary }}>
                      {config.label}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: EMBER.textTertiary }}>
                      {config.description}
                    </p>
                  </div>
                  {config.timerSeconds !== null && (
                    <span
                      className="clip-chip-sm shrink-0 px-2 py-0.5 font-display font-bold"
                      style={{
                        fontSize:  10,
                        color:     accent,
                        background: `${accent}1A`,
                        boxShadow: `inset 0 0 0 1px ${accent}33`,
                      }}
                    >
                      {config.timerSeconds}s
                    </span>
                  )}
                </button>
              );
            })}
          </div>

        ) : step === 2 ? (
          /* ── Arena selection ────────────────────────────────────────────── */
          <div className="grid grid-cols-2 gap-3">
            {ARENAS.map(([arena, config]) => (
              <button
                key={arena}
                onClick={() => handleArenaSelect(arena)}
                className="clip-card flex flex-col items-center gap-2 p-4 transition-all active:scale-[0.98]"
                style={selectionStyle(selectedArena === arena)}
              >
                <ArenaIcon arena={arena} size={28} />
                <p
                  className="text-sm font-semibold text-center leading-tight font-display"
                  style={{ color: EMBER.textPrimary }}
                >
                  {config.label}
                </p>
              </button>
            ))}
          </div>

        ) : (
          /* ── Challenge type ─────────────────────────────────────────────── */
          <div className="space-y-4">
            <button
              onClick={handleCreatePrivate}
              disabled={createDuel.isPending}
              className="clip-card w-full flex flex-col items-start gap-2 p-5 text-left transition-all active:opacity-90 disabled:opacity-50"
              style={{ background: EMBER.surface }}
            >
              <Link2 className="h-6 w-6" style={{ color: EMBER.accent }} />
              <p className="font-display font-semibold" style={{ color: EMBER.textPrimary }}>
                Challenge a friend
              </p>
              <p className="text-sm" style={{ color: EMBER.textTertiary }}>
                Get a shareable code to send to a specific person.
              </p>
            </button>

            <button
              onClick={handleMatchmake}
              disabled={matchmake.isPending}
              className="clip-card w-full flex flex-col items-start gap-2 p-5 text-left transition-all active:opacity-90 disabled:opacity-50"
              style={{ background: EMBER.surface }}
            >
              <Shuffle className="h-6 w-6" style={{ color: EMBER.accent }} />
              <p className="font-display font-semibold" style={{ color: EMBER.textPrimary }}>
                Find a random opponent
              </p>
              <p className="text-sm" style={{ color: EMBER.textTertiary }}>
                We'll match you with someone ready to play right now.
              </p>
            </button>

            {(createDuel.isPending || matchmake.isPending) && (
              <div className="flex justify-center pt-2">
                <div
                  className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
                  style={{ borderColor: EMBER.accent, borderTopColor: 'transparent' }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
