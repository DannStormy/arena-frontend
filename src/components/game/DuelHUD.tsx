// DuelHUD — head-to-head bar: two player sides, mode badge, question progress.
// Score numbers animate (punch/scale) when the value changes — tied to socket-driven state,
// not produced here. Opponent avatar flashes when opponent answers.
import { useState, useEffect, useRef } from 'react';
import { Flame } from 'lucide-react';
import { ModeIcon } from '@/components/common/ModeIcon';
import type { DuelMode } from '@/types/duel.types';

// ── Score number that punches/scales on change ───────────────────────────────
function ScoreDisplay({ score, accent }: { score: number; accent: string }) {
  const prevScore = useRef(score);
  const [pulsing, setPulsing]   = useState(false);
  const reduced = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (score !== prevScore.current) {
      prevScore.current = score;
      if (!reduced) {
        setPulsing(true);
        const t = setTimeout(() => setPulsing(false), 400);
        return () => clearTimeout(t);
      }
    }
  }, [score, reduced]);

  return (
    <span
      className="font-display font-black text-2xl tabular-nums leading-none"
      style={{
        display:    'inline-block',
        transition: reduced ? undefined : 'transform 0.15s ease-out, color 0.15s ease-out',
        transform:  pulsing ? 'scale(1.4)' : 'scale(1)',
        color:      pulsing ? accent : 'white',
      }}
    >
      {score}
    </span>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────
export interface DuelHUDProps {
  mode: DuelMode;
  modeAccent: string;
  myUsername: string;
  myAvatarUrl?: string | null;
  myScore: number;
  myStreak: number;
  opponentName: string;
  opponentScore: number;
  opponentStreak: number;
  opponentHasAnswered: boolean;
  questionIndex: number;
  totalQuestions: number;
  isSuddenDeath: boolean;
  isStreakMode: boolean;
}

export function DuelHUD({
  mode, modeAccent, myUsername, myAvatarUrl,
  myScore, myStreak, opponentName, opponentScore, opponentStreak,
  opponentHasAnswered, questionIndex, totalQuestions,
  isSuddenDeath, isStreakMode,
}: DuelHUDProps) {
  const myInitials  = myUsername.slice(0, 2).toUpperCase();
  const oppInitials = opponentName.slice(0, 2).toUpperCase();

  // Flash opponent avatar when they answer — tied to socket event, not produced here
  const prevOppAnswered = useRef(false);
  const [oppBeat, setOppBeat] = useState(false);
  const reduced = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (opponentHasAnswered && !prevOppAnswered.current) {
      prevOppAnswered.current = true;
      if (!reduced) {
        setOppBeat(true);
        const t = setTimeout(() => setOppBeat(false), 700);
        return () => clearTimeout(t);
      }
    }
    if (!opponentHasAnswered) {
      prevOppAnswered.current = false;
      setOppBeat(false);
    }
  }, [opponentHasAnswered, reduced]);

  return (
    <div
      className="px-4 pt-safe-top pb-3 border-b border-arena-border"
      style={{ background: `${modeAccent}0A` }}
    >
      <div className="flex items-center gap-2">

        {/* ── My side ── */}
        <div className="flex-1 flex items-center gap-2.5 min-w-0">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
            style={{ background: '#7C5CFF' }}
          >
            {myAvatarUrl ? (
              <img src={myAvatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-white text-xs font-bold select-none">{myInitials}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-arena-text-tertiary text-[10px] leading-none truncate mb-0.5">
              {myUsername}
            </p>
            {isSuddenDeath ? (
              <p className="text-arena-green text-sm font-black leading-none">ALIVE</p>
            ) : (
              <ScoreDisplay score={myScore} accent={modeAccent} />
            )}
            {isStreakMode && myStreak > 1 && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] font-bold mt-0.5"
                style={{ color: modeAccent }}
              >
                <Flame className="h-2.5 w-2.5" />{myStreak}x
              </span>
            )}
          </div>
        </div>

        {/* ── Center ── */}
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <ModeIcon mode={mode} size={30} iconSize={15} />
          <p className="text-arena-text-tertiary text-[10px] font-medium tabular-nums">
            {questionIndex + 1}
            <span className="text-arena-text-tertiary/40">/{totalQuestions}</span>
          </p>
          {isSuddenDeath && (
            <p className="text-[8px] text-arena-red font-black uppercase tracking-wide">
              1 wrong = out
            </p>
          )}
        </div>

        {/* ── Opponent side ── */}
        <div className="flex-1 flex items-center justify-end gap-2.5 min-w-0">
          <div className="text-right min-w-0">
            <p className="text-arena-text-tertiary text-[10px] leading-none truncate mb-0.5">
              {opponentName}
            </p>
            {isSuddenDeath ? (
              <p className="text-arena-green text-sm font-black leading-none">ALIVE</p>
            ) : (
              <ScoreDisplay score={opponentScore} accent={modeAccent} />
            )}
            {isStreakMode && opponentStreak > 1 && (
              <span
                className="inline-flex items-center justify-end gap-0.5 text-[10px] font-bold mt-0.5"
                style={{ color: modeAccent }}
              >
                {opponentStreak}x<Flame className="h-2.5 w-2.5" />
              </span>
            )}
          </div>
          {/* Avatar — flashes with mode-accent ring when opponent answers */}
          <div
            className="h-9 w-9 rounded-full bg-arena-elev flex items-center justify-center shrink-0 transition-shadow duration-150"
            style={{
              boxShadow: oppBeat
                ? `0 0 0 2px ${modeAccent}, 0 0 12px ${modeAccent}55`
                : opponentHasAnswered
                ? `0 0 0 2px ${modeAccent}50`
                : 'none',
            }}
          >
            <span className="text-white/60 text-xs font-bold select-none">{oppInitials}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
