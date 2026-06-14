// TournamentHUD — solo game HUD for tournament play.
// Shows score (animated on change), question progress, game-type badge, and an honest
// async standing ("3rd of 12 so far"). Timer display binds to the caller's timeLeft
// value — this component does NOT own or reimplement timing logic.
import { useState, useEffect, useRef } from 'react';
import { Zap, Trophy } from 'lucide-react';
import type { GameType } from '@/types/tournament.types';

// ── Score punch — same pattern as DuelHUD ────────────────────────────────────
function ScoreDisplay({ score, accent }: { score: number; accent: string }) {
  const prevScore = useRef(score);
  const [pulsing, setPulsing] = useState(false);
  const reduced =
    typeof window !== 'undefined' &&
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

// ── GameType config ───────────────────────────────────────────────────────────
const GAME_TYPE_CONFIG: Record<GameType, { label: string; icon: React.ReactNode }> = {
  lightning_trivia:  { label: 'Lightning Trivia',  icon: <Zap size={11} />    },
  last_man_standing: { label: 'Last Man Standing', icon: <Trophy size={11} /> },
};

// ── Props ─────────────────────────────────────────────────────────────────────
export interface TournamentHUDProps {
  gameType: GameType;
  modeAccent: string;
  score: number;
  /** Display only — bound to the caller's existing timeLeft state. Does not own timing. */
  timeLeft: number;
  questionIndex: number;
  totalQuestions: number;
  myRank: number | null;
  totalFinished: number;
  myPrize: string | null;
}

export function TournamentHUD({
  gameType, modeAccent, score, timeLeft,
  questionIndex, totalQuestions, myRank, totalFinished, myPrize,
}: TournamentHUDProps) {
  const cfg         = GAME_TYPE_CONFIG[gameType];
  const isLMS       = gameType === 'last_man_standing';
  const timerDanger = timeLeft <= 3;
  const timerWarn   = timeLeft <= 5 && !timerDanger;
  const showStanding = myRank !== null && totalFinished > 0;

  return (
    <div
      className="px-4 pt-safe-top pb-3 border-b border-arena-border"
      style={{ background: `${modeAccent}0A` }}
    >
      <div className="flex items-center gap-2">

        {/* ── Score ── */}
        <div className="flex-1">
          <p className="text-[10px] text-arena-text-tertiary leading-none mb-0.5">Score</p>
          <ScoreDisplay score={score} accent={modeAccent} />
          {isLMS && (
            <p className="text-[8px] text-arena-red font-black uppercase tracking-wide mt-0.5">
              precision counts
            </p>
          )}
        </div>

        {/* ── Game type badge + question progress ── */}
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <div
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: `${modeAccent}22`, color: modeAccent }}
          >
            {cfg.icon}
            {cfg.label}
          </div>
          <p className="text-arena-text-tertiary text-[10px] font-medium tabular-nums">
            {questionIndex + 1}
            <span className="text-arena-text-tertiary/40">/{totalQuestions}</span>
          </p>
        </div>

        {/* ── Timer display (bound to caller's timeLeft, does NOT own timing) ── */}
        <div className="flex-1 text-right">
          <p className="text-[10px] text-arena-text-tertiary leading-none mb-0.5">Time</p>
          <span
            className="font-display font-black text-2xl tabular-nums leading-none"
            style={{
              display: 'inline-block',
              color: timerDanger ? '#FF4D5E' : timerWarn ? '#F5B73D' : 'white',
            }}
          >
            {timeLeft}
          </span>
        </div>

      </div>

      {/* ── Honest async standing ─────────────────────────────────────────── */}
      {/* "so far" frames that this is against finished players, not a live field */}
      {showStanding && (
        <div
          className="flex items-center justify-between mt-2 pt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span className="text-[11px] font-semibold" style={{ color: modeAccent }}>
            #{myRank} of {totalFinished} so far
          </span>
          {myPrize ? (
            <span className="text-[11px] font-semibold text-arena-green">
              In the money · ₦{Number(myPrize).toLocaleString()}
            </span>
          ) : (
            <span className="text-[11px] text-arena-text-tertiary">
              Top 3 win cash
            </span>
          )}
        </div>
      )}
    </div>
  );
}
