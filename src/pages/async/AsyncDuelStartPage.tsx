import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Brain, Swords, X, Zap } from 'lucide-react';
import { useCreateAsyncDuel, useMatchmakeAsyncDuel } from '@/hooks/use-async-duels';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EMBER } from '@/lib/ember';
import type { ChallengeMode } from '@/types/challenge.types';

// intent=friend → challenge-a-friend (create); intent=quick → ghost matchmake.
type Intent = 'friend' | 'quick';

const MODES: { value: ChallengeMode; label: string; hint: string; icon: React.ReactNode }[] = [
  { value: 'speed_math', label: 'Speed Math', hint: 'Pure arithmetic sprint', icon: <Zap size={18} /> },
  { value: 'brain_duel', label: 'Brain Duel', hint: 'Mixed challenge set', icon: <Brain size={18} /> },
];

const DIFFICULTIES = [
  { value: 2, label: 'Easy' },
  { value: 3, label: 'Normal' },
  { value: 5, label: 'Hard' },
  { value: 7, label: 'Expert' },
];

export function AsyncDuelStartPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const intent: Intent = params.get('intent') === 'quick' ? 'quick' : 'friend';

  const [mode, setMode] = useState<ChallengeMode>('speed_math');
  const [difficulty, setDifficulty] = useState(3);

  const create = useCreateAsyncDuel();
  const matchmake = useMatchmakeAsyncDuel();
  const pending = create.isPending || matchmake.isPending;

  const start = () => {
    if (intent === 'quick') {
      matchmake.mutate(
        { mode, difficulty },
        { onSuccess: (set) => navigate(`/async/${set.code}`, { state: { set } }) },
      );
    } else {
      create.mutate(
        { mode, difficulty, count: 10 },
        { onSuccess: (set) => navigate(`/async/${set.code}`, { state: { set, isCreator: true } }) },
      );
    }
  };

  const title = intent === 'quick' ? 'Quick Match' : 'Challenge a Friend';
  const subtitle =
    intent === 'quick'
      ? 'Play a stored ghost run. Beat their recorded score.'
      : 'Create a set, play it, then share a link for a friend to beat.';
  const cta = intent === 'quick' ? 'Find match' : 'Create & play';

  return (
    <div className="flex min-h-svh flex-col" style={{ background: EMBER.base }}>
      <div className="flex items-center px-4 pt-4">
        <button
          onClick={() => navigate('/')}
          className="flex h-9 w-9 items-center justify-center"
          style={{ color: EMBER.textTertiary }}
          aria-label="Back"
        >
          <X size={20} />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-5 pb-8 pt-4">
        <div
          className="mb-5 flex items-center justify-center"
          style={{ width: 64, height: 64, background: 'rgba(232,137,59,0.13)' }}
        >
          <Swords size={30} style={{ color: EMBER.accent }} />
        </div>
        <h1 className="font-display text-2xl font-bold" style={{ color: EMBER.textPrimary }}>
          {title}
        </h1>
        <p className="mt-2 text-sm" style={{ color: EMBER.textSecondary }}>
          {subtitle}
        </p>

        {/* Mode */}
        <p
          className="mt-8 font-display text-xs font-semibold uppercase tracking-[0.1em]"
          style={{ color: EMBER.textTertiary }}
        >
          Mode
        </p>
        <div className="mt-3 space-y-2">
          {MODES.map((m) => {
            const active = m.value === mode;
            return (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className="clip-row flex w-full items-center gap-3 px-4 py-3 text-left transition-all active:scale-[0.99]"
                style={{
                  background: active ? 'rgba(232,137,59,0.12)' : EMBER.surface,
                  boxShadow: active ? 'inset 0 0 0 1px rgba(232,137,59,0.45)' : 'none',
                }}
              >
                <span style={{ color: active ? EMBER.accent : EMBER.textTertiary }}>{m.icon}</span>
                <span className="flex-1">
                  <span
                    className="block font-display text-sm font-semibold"
                    style={{ color: EMBER.textPrimary }}
                  >
                    {m.label}
                  </span>
                  <span className="block text-xs" style={{ color: EMBER.textTertiary }}>
                    {m.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Difficulty */}
        <p
          className="mt-6 font-display text-xs font-semibold uppercase tracking-[0.1em]"
          style={{ color: EMBER.textTertiary }}
        >
          Difficulty
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {DIFFICULTIES.map((d) => {
            const active = d.value === difficulty;
            return (
              <button
                key={d.value}
                onClick={() => setDifficulty(d.value)}
                className="clip-chip-sm flex h-11 items-center justify-center font-display text-xs font-bold transition-all active:scale-[0.97]"
                style={{
                  background: active ? 'rgba(240,176,90,0.14)' : EMBER.surface,
                  color: active ? EMBER.accentBright : EMBER.textSecondary,
                  boxShadow: active ? 'inset 0 0 0 1px rgba(240,176,90,0.45)' : 'none',
                }}
              >
                {d.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        <button
          onClick={start}
          disabled={pending}
          className="clip-card mt-8 flex h-14 w-full items-center justify-center gap-2 font-display text-base font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: 'linear-gradient(150deg, #E8893B, #C2541E)' }}
        >
          {pending ? <LoadingSpinner size="sm" /> : cta}
        </button>
      </div>
    </div>
  );
}
