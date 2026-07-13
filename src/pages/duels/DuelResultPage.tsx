import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Flag, Zap, Share2, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReportQuestionPicker } from '@/components/common/ReportQuestionPicker';
import { Particles } from '@/components/common/Particles';
import { ProgressionReveal } from '@/components/common/ProgressionReveal';
import { TierBadge } from '@/components/common/TierBadge';
import { useDuel } from '@/hooks/use-duels';
import { useDuelStore } from '@/stores/duel.store';
import { useAuthStore } from '@/stores/auth.store';
import { disconnectDuelSocket } from '@/lib/duel-socket';
import { EMBER } from '@/lib/ember';
import { pickQuip, type QuipContext } from '@/lib/quips';
import { type DuelCompletePayload } from '@/types/duel.types';
import type { TournamentArena } from '@/types/tournament.types';

const ARENA_LABELS: Record<TournamentArena, string> = {
  naija_street_smarts: 'Naija Street Smarts',
  sports_arena:        'Sports Arena',
  entertainment_zone:  'Entertainment Zone',
  brain_box:           'Brain Box',
  faith_and_values:    'Faith & Values',
  tech_and_hustle:     'Tech & Hustle',
};

type ResultState = DuelCompletePayload & {
  challengerCorrect?: number;
  opponentCorrect?:   number;
  questionSummary?: {
    questionIndex:   number;
    challengerResult: string;
    opponentResult:  string;
    questionId?:     string;
  }[];
  forfeited?:   boolean;
  forfeitedBy?: string;
};

type QuestionItem = NonNullable<ResultState['questionSummary']>[number];

// ── Layered radial-depth backgrounds ─────────────────────────────────────
// These are the "pool of light + vignette" backgrounds from the spec.

const WIN_BG =
  'radial-gradient(120% 80% at 50% 22%, rgba(232,137,59,0.22), rgba(232,137,59,0.06) 38%, transparent 64%), ' +
  'radial-gradient(90% 60% at 50% 18%, rgba(240,176,90,0.14), transparent 55%), ' +
  'radial-gradient(140% 120% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%), ' +
  '#08080D';

const LOSS_BG =
  'radial-gradient(120% 80% at 50% 22%, rgba(138,51,36,0.26), rgba(138,51,36,0.07) 38%, transparent 64%), ' +
  'radial-gradient(90% 60% at 50% 18%, rgba(208,90,63,0.12), transparent 55%), ' +
  'radial-gradient(140% 120% at 50% 50%, transparent 55%, rgba(0,0,0,0.6) 100%), ' +
  '#08080D';

// ── Label style helper ────────────────────────────────────────────────────

const LABEL: React.CSSProperties = {
  fontSize:      9,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color:         '#8f8478',
};

// ── Animated score ────────────────────────────────────────────────────────
// Both players count up. Winner gets punch + ember glow. On a loss screen,
// opponent is never "winner" — don't celebrate them.

function AnimatedScore({
  value,
  isWinner,
  reduced,
  winSize = '4rem',
  loseSize = '3rem',
}: {
  value: number;
  isWinner: boolean;
  reduced: boolean;
  winSize?: string;
  loseSize?: string;
}) {
  const [display,  setDisplay]  = useState(reduced ? value : 0);
  const [punching, setPunching] = useState(false);
  const [glowing,  setGlowing]  = useState(false);

  useEffect(() => {
    if (reduced) return;
    const dur   = 700;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else if (isWinner) {
        setPunching(true);
        setTimeout(() => setPunching(false), 180);
        setGlowing(true);
        setTimeout(() => setGlowing(false), 950);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span
      className="font-display tabular-nums select-none"
      style={{
        display:    'inline-block',
        fontWeight: 700,
        fontSize:   isWinner ? winSize : loseSize,
        lineHeight: 1,
        color:      isWinner ? EMBER.accent : '#6b6258',
        transform:  punching ? 'scale(1.12)' : 'scale(1)',
        transition: punching ? 'transform 0.08s ease-out' : 'transform 0.18s ease-out',
        filter:     glowing ? 'drop-shadow(0 0 16px rgba(232,137,59,0.60))' : undefined,
      }}
    >
      {display}
    </span>
  );
}

// ── Hero crest ──────────────────────────────────────────────────────────────
// Rich ember-metal hex crest (win) / crimson (loss) / muted (tie). Richness
// comes from the metal bevels + double border + HUD ticks — NO glow halo.
// Flat / sharp / machined; not glossy 3D. Win = ascending chevrons; loss =
// a single broken downward mark; tie = flat equal bars.

function HexCrest({ variant, reduced }: { variant: 'win' | 'loss' | 'tie'; reduced: boolean }) {
  const hex   = 'M60,2 L110,32 L110,92 L60,122 L10,92 L10,32 Z';
  const inner = 'M60,12.4 L101,37 L101,86.2 L60,110.8 L19,86.2 L19,37 Z';

  // Win-only subtle settle. Loss/tie static. prefers-reduced-motion gated.
  const [settled, setSettled] = useState(variant !== 'win' || reduced);
  useEffect(() => {
    if (variant === 'win' && !reduced) {
      const t = setTimeout(() => setSettled(true), 40);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const faceId = `crestFace_${variant}`;
  const edgeId = `crestEdge_${variant}`;

  const edgeStops =
    variant === 'win' ? (
      <>
        <stop offset="0"   stopColor="#F8C078" />
        <stop offset="0.4" stopColor="#E8893B" />
        <stop offset="0.7" stopColor="#C2541E" />
        <stop offset="1"   stopColor="#7a2f0e" />
      </>
    ) : variant === 'loss' ? (
      <>
        <stop offset="0"    stopColor="#d98a6f" />
        <stop offset="0.45" stopColor="#8a3324" />
        <stop offset="1"    stopColor="#4a1810" />
      </>
    ) : (
      <>
        <stop offset="0"   stopColor="#b8b0a6" />
        <stop offset="0.5" stopColor="#6b6258" />
        <stop offset="1"   stopColor="#2c2820" />
      </>
    );

  const innerStroke = variant === 'win' ? '#C2541E' : variant === 'loss' ? '#8a3324' : '#4a423a';
  const hiColor     = variant === 'win' ? '#F8C078' : variant === 'loss' ? '#d98a6f' : '#b8b0a6';
  const shColor     = variant === 'win' ? '#7a2f0e' : variant === 'loss' ? '#4a1810' : '#2c2820';
  const tickColor   = variant === 'win' ? '#F8C078' : variant === 'loss' ? '#d98a6f' : '#8f8478';

  return (
    <svg
      width={93}
      height={96}
      viewBox="0 0 120 124"
      fill="none"
      style={{
        transform:  settled ? 'scale(1)' : 'scale(1.08)',
        transition: 'transform 620ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <defs>
        <linearGradient id={faceId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0"   stopColor="#1c1510" />
          <stop offset="0.5" stopColor="#140f0b" />
          <stop offset="1"   stopColor="#0c0907" />
        </linearGradient>
        <linearGradient id={edgeId} x1="0" y1="0" x2="0" y2="1">
          {edgeStops}
        </linearGradient>
      </defs>

      {/* 1. crest face */}
      <path d={hex} fill={`url(#${faceId})`} stroke={`url(#${edgeId})`} strokeWidth={4} strokeLinejoin="round" />
      {/* 2. inner double border */}
      <path d={inner} fill="none" stroke={innerStroke} strokeWidth={1} opacity={0.5} strokeLinejoin="round" />
      {/* 3. bevel highlight — top two edges catching light */}
      <path d="M10,32 L60,2 L110,32" fill="none" stroke={hiColor} strokeWidth={2} opacity={0.85} strokeLinecap="round" strokeLinejoin="round" />
      {/* 4. bevel shadow — bottom two edges */}
      <path d="M110,92 L60,122 L10,92" fill="none" stroke={shColor} strokeWidth={2} opacity={0.8} strokeLinecap="round" strokeLinejoin="round" />

      {/* 5. center mark */}
      {variant === 'win' && (
        <>
          <path d="M42,82 L60,70 L78,82" fill="none" stroke="#C2541E" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M42,70 L60,58 L78,70" fill="none" stroke="#E8893B" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M42,58 L60,46 L78,58" fill="none" stroke="#F8C078" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {variant === 'loss' && (
        <>
          {/* broken downward chevron — the two arms are offset, cracked at the vertex */}
          <path d="M40,51 L59,68" fill="none" stroke="#d05a3f" strokeWidth={5} strokeLinecap="round" />
          <path d="M61,65 L80,51" fill="none" stroke="#d05a3f" strokeWidth={5} strokeLinecap="round" />
        </>
      )}
      {variant === 'tie' && (
        <>
          <path d="M44,54 L76,54" fill="none" stroke="#8f8478" strokeWidth={5} strokeLinecap="round" />
          <path d="M44,66 L76,66" fill="none" stroke="#8f8478" strokeWidth={5} strokeLinecap="round" />
        </>
      )}

      {/* 6. HUD corner ticks — two opposite corners */}
      <path d="M8,18 L8,8 L18,8"          fill="none" stroke={tickColor} strokeWidth={1.5} opacity={0.7} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M112,106 L112,116 L102,116" fill="none" stroke={tickColor} strokeWidth={1.5} opacity={0.7} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Breakdown dots ────────────────────────────────────────────────────────
// Two clearly distinct rows: YOU reads bright (ember correct / crimson wrong),
// OPP reads muted (grey correct / hollow grey-ring wrong).

function BreakdownDots({
  questionSummary,
  iAmChallenger,
}: {
  questionSummary: QuestionItem[];
  iAmChallenger: boolean;
}) {
  const rows: Array<{ label: string; getResult: (q: QuestionItem) => string; dim: boolean }> = [
    {
      label:     'You',
      getResult: (q) => (iAmChallenger ? q.challengerResult : q.opponentResult),
      dim:       false,
    },
    {
      label:     'Opp',
      getResult: (q) => (iAmChallenger ? q.opponentResult : q.challengerResult),
      dim:       true,
    },
  ];

  return (
    <div style={{ padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map(({ label, getResult, dim }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...LABEL, width: 22, flexShrink: 0, color: dim ? '#6b6258' : '#c9bfb4' }}>{label}</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {questionSummary.map((q, i) => {
              const correct = getResult(q) === 'correct';
              // YOU row reads bright (ember / crimson); OPP row reads muted
              // (filled grey / hollow grey ring) so the two are distinct at a glance.
              const fillColor = dim
                ? (correct ? '#6b6258' : 'transparent')
                : (correct ? '#E8893B' : '#d05a3f');
              const borderColor = dim
                ? (correct ? '#6b6258' : '#4a423a')
                : (correct ? '#E8893B' : '#d05a3f');
              return (
                <div
                  key={i}
                  style={{
                    width:        9,
                    height:       9,
                    borderRadius: '50%',
                    background:   fillColor,
                    border:       `1.5px solid ${borderColor}`,
                    flexShrink:   0,
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export function DuelResultPage() {
  const { id }         = useParams<{ id: string }>();
  const location       = useLocation();
  const navigate       = useNavigate();
  const userId         = useAuthStore((s) => s.user?.id);
  const { resetDuel }  = useDuelStore();

  const [showBreakdown,    setShowBreakdown]    = useState(false);
  const [reportingQuestion, setReportingQuestion] = useState<{ id: string; index: number } | null>(null);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const result = location.state as ResultState | null;
  const { data: duel, isLoading } = useDuel(id!);

  useEffect(() => { disconnectDuelSocket(); }, []);

  if (!result && isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center" style={{ background: '#08080D' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ── Derivations ───────────────────────────────────────────────────────────

  const iAmChallenger = duel?.challengerId === userId;
  const myScore    = result
    ? (iAmChallenger ? result.challengerScore : result.opponentScore)
    : (iAmChallenger ? duel?.challengerScore ?? 0 : duel?.opponentScore ?? 0);
  const theirScore = result
    ? (iAmChallenger ? result.opponentScore  : result.challengerScore)
    : (iAmChallenger ? duel?.opponentScore  ?? 0 : duel?.challengerScore ?? 0);
  const myUsername   = iAmChallenger ? duel?.challengerUsername : duel?.opponentUsername;
  const opponentName = iAmChallenger ? duel?.opponentUsername   : duel?.challengerUsername;

  const totalQ       = duel?.totalQuestions ?? 0;
  const myCorrect    = result
    ? (iAmChallenger ? result.challengerCorrect : result.opponentCorrect)
    : (iAmChallenger ? duel?.challengerCorrect  : duel?.opponentCorrect) ?? null;
  const theirCorrect = result
    ? (iAmChallenger ? result.opponentCorrect   : result.challengerCorrect)
    : (iAmChallenger ? duel?.opponentCorrect    : duel?.challengerCorrect) ?? null;
  const questionSummary = result?.questionSummary ?? duel?.questionSummary;
  const myAccuracy    = myCorrect    != null && totalQ > 0 ? Math.round((myCorrect    / totalQ) * 100) : null;
  const theirAccuracy = theirCorrect != null && totalQ > 0 ? Math.round((theirCorrect / totalQ) * 100) : null;

  const suddenDeathRounds = result?.suddenDeathRounds ?? duel?.suddenDeathRounds ?? 0;
  const isSuddenDeath = duel?.mode === 'sudden_death';
  const eliminatedOn  = `Q${(duel?.currentQuestionIndex ?? 0) + 1}`;
  const iWon         = duel?.winnerId === userId;
  const isTie        = duel?.isTie ?? result?.isTie ?? false;
  const forfeited    = result?.forfeited;
  const forfeitedBy  = result?.forfeitedBy;
  const prizeWon     = result?.prizeWon;
  const progression  = result?.myProgression ?? null;
  const myRankAfter  = result?.myProgression?.rankAfter ?? null;
  // Opponent tier from BE's opponentProgression. null = data genuinely absent
  // for this duel → graceful empty slot, mirroring the player's own badge.
  const opponentTier = result?.opponentProgression?.tier ?? null;

  if (result && !result.myProgression) {
    console.warn('[ProgressionReveal] duel_complete payload missing myProgression — XP reveal will not show', result);
  }

  const tiebreakMs   = duel?.tiebreakDeltaMs;
  const tiebreakLine = tiebreakMs
    ? `Tiebreaker · ${iWon ? 'You were' : `${opponentName ?? 'Opponent'} was`} ${(tiebreakMs / 1000).toFixed(1)}s faster`
    : null;

  const modeLabel  = duel?.mode ? duel.mode.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';
  const arenaLabel = duel?.arena ? (ARENA_LABELS[duel.arena] ?? duel.arena) : '—';

  // ── Outcome config ────────────────────────────────────────────────────────

  const iForfeited   = forfeited && forfeitedBy === userId;
  const theyForfeited = forfeited && forfeitedBy !== userId;

  let outcomeLabel: string;
  let outcomeIcon: React.ReactNode;
  let pageBg: string;

  if (iForfeited) {
    outcomeLabel = 'You Forfeited';
    outcomeIcon  = <HexCrest variant="loss" reduced={reducedMotion} />;
    pageBg       = LOSS_BG;
  } else if (theyForfeited) {
    outcomeLabel = 'Opponent Forfeited';
    outcomeIcon  = <HexCrest variant="win" reduced={reducedMotion} />;
    pageBg       = WIN_BG;
  } else if (isTie) {
    outcomeLabel = "It's a Tie";
    outcomeIcon  = <HexCrest variant="tie" reduced={reducedMotion} />;
    pageBg       = '#08080D';
  } else if (iWon) {
    outcomeLabel = 'You Won';
    outcomeIcon  = <HexCrest variant="win" reduced={reducedMotion} />;
    pageBg       = WIN_BG;
  } else {
    outcomeLabel = 'You Lost';
    outcomeIcon  = <HexCrest variant="loss" reduced={reducedMotion} />;
    pageBg       = LOSS_BG;
  }

  // Quip slot — a breezy one-liner under the verdict. Seeded on the duel id so
  // it stays put across re-renders. Fill the lines in src/lib/quips.ts.
  const quipContext: QuipContext = isTie ? 'tie' : iWon || theyForfeited ? 'win' : 'loss';
  const quip = pickQuip(quipContext, id);

  const handleShare = async () => {
    const outcome = iWon ? 'won' : isTie ? 'tied' : 'lost';
    const text    = `I just ${outcome} a duel on Arena! ${myScore} vs ${theirScore}`;
    if (navigator.share) {
      await navigator.share({ title: 'Arena Duel', text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Result copied!');
    }
  };

  return (
    <div className="relative min-h-svh" style={{ background: pageBg }}>
      <Particles />

      <div className="relative z-10 mx-auto w-full max-w-[420px] px-5 pt-safe-top pb-12 flex flex-col">

        {/* ── Hero: icon + label + prize ────────────────────────────────── */}
        <div className="flex flex-col items-center pt-16 pb-10 gap-4 text-center">
          <span className="animate-result-reveal">{outcomeIcon}</span>

          <div className="space-y-1.5">
            <p
              className="font-display"
              style={{ fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.1, letterSpacing: '-0.01em', color: EMBER.textPrimary }}
            >
              {outcomeLabel}
            </p>
            {quip && (
              <p className="font-display" style={{ fontSize: 13, color: EMBER.textTertiary }}>
                {quip}
              </p>
            )}
            {suddenDeathRounds > 0 && !isTie && (
              <p className="font-display flex items-center justify-center gap-1.5" style={{ ...LABEL, color: EMBER.accent }}>
                <Zap className="h-3 w-3" /> Sudden death
              </p>
            )}
            {tiebreakLine && (
              <p style={{ fontSize: 12, color: '#8f8478' }}>{tiebreakLine}</p>
            )}
          </div>

          {parseFloat(prizeWon ?? '0') > 0 && (iWon || theyForfeited) && (
            <div
              className="clip-chip px-4 py-1.5"
              style={{ background: 'rgba(232,137,59,0.12)', boxShadow: 'inset 0 0 0 1px rgba(232,137,59,0.38)' }}
            >
              <p className="font-display font-semibold text-sm" style={{ color: EMBER.accentBright }}>
                +₦{prizeWon} added to wallet
              </p>
            </div>
          )}
        </div>

        {/* ── Scores — floating on the depth bg ────────────────────────── */}
        <div className="flex items-center justify-around pb-10">

          {/* My column */}
          <div className="flex flex-col items-center gap-2">
            <p className="font-display" style={{ ...LABEL, letterSpacing: '0.09em' }}>
              {myUsername ?? 'You'}
            </p>
            {myRankAfter && <TierBadge tier={myRankAfter} size="sm" />}
            {isSuddenDeath ? (
              <p
                className="font-display font-bold text-sm"
                style={{ color: iWon ? EMBER.accent : '#d05a3f' }}
              >
                {iWon ? `Won on ${eliminatedOn}` : `Eliminated ${eliminatedOn}`}
              </p>
            ) : (
              <>
                {/* Fixed score box (= max winner size) so emphasis can't shift the accuracy row */}
                <div style={{ height: '4rem', display: 'flex', alignItems: 'flex-end' }}>
                  <AnimatedScore
                    value={myScore}
                    isWinner={iWon && !isTie && !iForfeited}
                    reduced={reducedMotion}
                  />
                </div>
                {myAccuracy != null && (
                  <p style={{ fontSize: 11, color: '#8f8478' }}>{myAccuracy}% accuracy</p>
                )}
              </>
            )}
          </div>

          {/* VS */}
          <p className="font-display" style={{ fontWeight: 700, fontSize: '1.1rem', color: '#3a342c', paddingTop: 16 }}>
            VS
          </p>

          {/* Opponent column — isWinner always false (don't celebrate on my screen) */}
          <div className="flex flex-col items-center gap-2">
            <p className="font-display" style={{ ...LABEL, letterSpacing: '0.09em' }}>
              {opponentName ?? 'Opponent'}
            </p>
            {opponentTier && <TierBadge tier={opponentTier} size="sm" />}
            {isSuddenDeath ? (
              <p
                className="font-display font-bold text-sm"
                style={{ color: iWon ? '#d05a3f' : EMBER.accent }}
              >
                {iWon ? `Eliminated ${eliminatedOn}` : `Won on ${eliminatedOn}`}
              </p>
            ) : (
              <>
                {/* Same fixed score box as the player column → shared baseline */}
                <div style={{ height: '4rem', display: 'flex', alignItems: 'flex-end' }}>
                  <AnimatedScore
                    value={theirScore}
                    isWinner={false}
                    reduced={reducedMotion}
                    winSize="3rem"
                    loseSize="3rem"
                  />
                </div>
                {theirAccuracy != null && (
                  <p style={{ fontSize: 11, color: '#8f8478' }}>{theirAccuracy}% accuracy</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Quiet utility zone ────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">

          {/* Progression reveal */}
          {progression && <ProgressionReveal data={progression} />}

          {/* Stats strip */}
          <div
            className="grid grid-cols-3 gap-2 text-center py-3 px-2"
            style={{ background: 'rgba(0,0,0,0.28)', borderRadius: 10 }}
          >
            <div>
              <p className="font-display font-semibold text-sm" style={{ color: EMBER.textPrimary }}>
                {totalQ > 0
                  ? (suddenDeathRounds > 0 ? `${totalQ - suddenDeathRounds}+SD` : `${totalQ}`)
                  : '—'}
              </p>
              <p style={{ ...LABEL, marginTop: 3 }}>Questions</p>
            </div>
            <div>
              <p className="font-display font-semibold text-sm truncate" style={{ color: EMBER.textPrimary }}>
                {modeLabel}
              </p>
              <p style={{ ...LABEL, marginTop: 3 }}>Mode</p>
            </div>
            <div>
              <p className="font-display font-semibold text-sm truncate" style={{ color: EMBER.textPrimary }}>
                {arenaLabel}
              </p>
              <p style={{ ...LABEL, marginTop: 3 }}>Arena</p>
            </div>
          </div>

          {/* Breakdown — collapsed by default, dots on expand */}
          {questionSummary && questionSummary.length > 0 && (
            <div style={{ background: '#100e10', borderRadius: 10, overflow: 'hidden' }}>
              <button
                onClick={() => setShowBreakdown((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm transition-opacity hover:opacity-80"
                style={{ color: '#8f8478' }}
              >
                <span className="font-display font-medium" style={{ letterSpacing: '0.03em' }}>
                  Question breakdown
                </span>
                {showBreakdown
                  ? <ChevronUp   className="h-4 w-4 opacity-50" />
                  : <ChevronDown className="h-4 w-4 opacity-50" />}
              </button>

              {showBreakdown && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <BreakdownDots questionSummary={questionSummary} iAmChallenger={iAmChallenger} />

                  {questionSummary.some((q) => q.questionId) && (
                    <div
                      className="flex gap-1 px-4 pb-3"
                      style={{ paddingLeft: 38 }}
                    >
                      {questionSummary.map((q) =>
                        q.questionId ? (
                          <button
                            key={q.questionIndex}
                            onClick={() => setReportingQuestion({ id: q.questionId!, index: q.questionIndex })}
                            className="flex-1 flex items-center justify-center h-5 transition-colors"
                            style={{ color: 'rgba(255,255,255,0.12)' }}
                            title={`Report Q${q.questionIndex + 1}`}
                            onMouseEnter={(e) => (e.currentTarget.style.color = EMBER.accent)}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.12)')}
                          >
                            <Flag className="h-2.5 w-2.5" />
                          </button>
                        ) : (
                          <div key={q.questionIndex} className="flex-1 h-5" />
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CTAs */}
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={() => navigate('/duels/create', { state: { mode: duel?.mode, arena: duel?.arena } })}
              className="clip-card w-full h-12 font-display font-semibold text-base text-white active:scale-[0.98] active:opacity-90 hover:brightness-[1.06] transition-all select-none"
              style={{ background: 'linear-gradient(150deg, #E8893B, #C2541E)' }}
            >
              Rematch
            </button>
            <button
              onClick={handleShare}
              className="clip-row w-full h-11 text-sm flex items-center justify-center gap-2 select-none transition-colors"
              style={{
                color:     '#8f8478',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)',
              }}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share result
            </button>
            <button
              onClick={() => { resetDuel(); navigate('/duels'); }}
              className="w-full text-center text-sm py-2 transition-colors"
              style={{ color: '#8f8478' }}
            >
              Back to Duels
            </button>
          </div>
        </div>
      </div>

      <Dialog
        open={!!reportingQuestion}
        onOpenChange={(open) => { if (!open) setReportingQuestion(null); }}
      >
        <DialogContent className="bg-arena-surface border-arena-border text-white max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-arena-text-primary text-base font-display">
              Report Q{reportingQuestion ? reportingQuestion.index + 1 : ''}
            </DialogTitle>
          </DialogHeader>
          <p className="text-arena-text-tertiary text-xs">What's wrong with this question?</p>
          {reportingQuestion && (
            <ReportQuestionPicker
              questionId={reportingQuestion.id}
              onClose={() => setReportingQuestion(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
