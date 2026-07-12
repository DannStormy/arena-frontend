import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Copy, Home, Share2, Swords } from 'lucide-react';
import { toast } from 'sonner';
import { useAsyncDuelResult } from '@/hooks/use-async-duels';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ProgressionReveal } from '@/components/common/ProgressionReveal';
import { ShareButton } from '@/components/share/ShareButton';
import { EMBER } from '@/lib/ember';
import type {
  AsyncDuelProgressionSnapshot,
  AsyncDuelResult,
  AsyncDuelSideResult,
} from '@/types/async-duel.types';
import type { ChallengeMode } from '@/types/challenge.types';
import type { ProgressionData } from '@/types/duel.types';

// Backend ProgressionSnapshot → the ProgressionData shape ProgressionReveal wants.
// Field renames: firstGameOfDayBonus → firstDuelOfDayBonus; nullable next* coerced.
function toProgressionData(p: AsyncDuelProgressionSnapshot): ProgressionData {
  return {
    xpBefore: p.xpBefore,
    xpAfter: p.xpAfter,
    intoLevelBefore: p.intoLevelBefore,
    intoLevelAfter: p.intoLevelAfter,
    nextLevelAt: p.nextLevelAt ?? 0,
    levelBefore: p.levelBefore,
    levelAfter: p.levelAfter,
    spBefore: p.spBefore,
    spAfter: p.spAfter,
    rankBefore: p.rankBefore,
    rankAfter: p.rankAfter,
    rankFloor: p.rankFloor,
    nextRankAt: p.nextRankAt ?? 0,
    firstDuelOfDayBonus: p.firstGameOfDayBonus,
  };
}

export function AsyncDuelResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const myId = useAuthStore((s) => s.user?.id ?? '');

  const { data, isLoading, isError } = useAsyncDuelResult(id, {
    // Poll while the opponent hasn't finished; stop once the match resolves.
    refetchInterval: (query) =>
      query.state.data?.status === 'awaiting_opponent' ? 4000 : false,
  });

  if (isLoading) {
    return <Centered><LoadingSpinner size="lg" /></Centered>;
  }

  if (isError || !data) {
    return (
      <Centered>
        <Swords size={40} style={{ color: EMBER.textTertiary }} />
        <p className="font-display text-xl font-bold" style={{ color: EMBER.textPrimary }}>
          Result unavailable
        </p>
        <button
          onClick={() => navigate('/')}
          className="text-sm font-medium"
          style={{ color: EMBER.accent }}
        >
          Go to Arena
        </button>
      </Centered>
    );
  }

  // Identify which side is "me". For ghost matches the opponent has no userId;
  // the human is always the creator on the create/matchmake path.
  const iAmCreator = data.creator.userId === myId || data.opponent.userId !== myId;
  const me = iAmCreator ? data.creator : data.opponent;
  const them = iAmCreator ? data.opponent : data.creator;

  const isGhost = data.matchType === 'ghost';
  const waiting = data.status === 'awaiting_opponent';

  if (waiting) {
    return <WaitingScreen result={data} me={me} isGhost={isGhost} />;
  }

  // ── Resolved ────────────────────────────────────────────────────────────────
  const iWon = data.winnerId === myId && !data.isTie;
  const iLost = !data.isTie && data.winnerId !== null && data.winnerId !== myId;
  const outcome = data.isTie ? 'Draw' : iWon ? 'You win' : iLost ? 'You lose' : 'Result';
  const outcomeColor = iWon ? EMBER.accentBright : iLost ? EMBER.lossInk : EMBER.textSecondary;

  // Shareable challenge/rematch link — same code the M2 waiting screen shares.
  const challengeUrl = `${window.location.origin}/async/${data.code}`;
  const modeLabel = challengeModeLabel(data.mode);
  // Prefer the opponent's real name; fall back to a generic label (and never
  // render "@null"/"@undefined") when the backend couldn't resolve a username.
  const opponentName = them.username?.trim() || null;
  const opponentLabel = opponentName
    ? `@${opponentName}`
    : isGhost
      ? 'the ghost'
      : 'my opponent';
  const duelOutcome = data.isTie ? 'draw' : iWon ? 'win' : 'loss';
  const shareBadge = data.isTie ? 'Dead heat' : iWon ? 'Victory' : 'Got clipped';
  const shareKicker = iWon
    ? `I beat ${opponentLabel}`
    : data.isTie
      ? `Dead heat vs ${opponentLabel}`
      : `${opponentLabel} clipped me`;
  const shareCta = iWon
    ? 'Beat that.'
    : data.isTie
      ? 'Settle it — run it back.'
      : 'Run it back.';
  const shareText = iWon
    ? `I beat ${opponentLabel} ${me.score}–${them.score} on Arena. Beat that: ${challengeUrl}`
    : data.isTie
      ? `Dead heat with ${opponentLabel} ${me.score}–${them.score} on Arena — settle it: ${challengeUrl}`
      : `${opponentLabel} beat me ${them.score}–${me.score} on Arena. Run it back: ${challengeUrl}`;

  return (
    <div className="flex min-h-svh flex-col" style={{ background: EMBER.base }}>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-5 pb-8 pt-10">
        <p
          className="text-center font-display text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: EMBER.textTertiary }}
        >
          {isGhost ? 'Ghost match' : 'Duel complete'}
        </p>
        <p
          className="mt-2 text-center font-display text-4xl font-bold"
          style={{ color: outcomeColor }}
        >
          {outcome}
        </p>

        {/* Score row — me vs them */}
        <div className="mt-8 flex items-stretch">
          <ScoreCell label="You" side={me} highlight={iWon} />
          <div className="flex flex-col items-center justify-center px-3">
            <span className="font-display text-sm font-bold" style={{ color: EMBER.vsInk }}>
              VS
            </span>
          </div>
          <ScoreCell
            label={isGhost ? 'Ghost' : 'Opponent'}
            side={them}
            highlight={iLost}
            align="right"
          />
        </div>

        {/* Resolution note */}
        {data.resolution && data.resolution !== 'score' && (
          <p className="mt-4 text-center text-xs" style={{ color: EMBER.textTertiary }}>
            {resolutionLabel(data.resolution)}
          </p>
        )}

        {/* Progression reveal (my side, if awarded) */}
        {me.progression && (
          <div className="mt-6">
            <ProgressionReveal data={toProgressionData(me.progression)} />
          </div>
        )}

        <div className="flex-1" />

        {/* Branded share card + share (drives new players via the challenge link) */}
        <div className="mt-8">
          <ShareButton
            preview
            fileName="arena-duel"
            label={iWon ? 'Share the win' : 'Share · rematch'}
            shareText={shareText}
            shareUrl={challengeUrl}
            card={{
              variant: 'duel',
              outcome: duelOutcome,
              eyebrow: modeLabel,
              kicker: shareKicker,
              headline: `${me.score.toLocaleString()}–${them.score.toLocaleString()}`,
              badge: shareBadge,
              cta: shareCta,
              stats: [
                { label: 'You', value: me.score.toLocaleString() },
                {
                  label: opponentName ?? (isGhost ? 'Ghost' : 'Them'),
                  value: them.score.toLocaleString(),
                },
              ],
            }}
          />
        </div>

        <button
          onClick={() => navigate('/')}
          className="clip-card mt-3 flex h-14 w-full items-center justify-center gap-2 font-display text-base font-bold text-white transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(150deg, #E8893B, #C2541E)' }}
        >
          <Home size={18} /> Home
        </button>
      </div>
    </div>
  );
}

// ── Waiting-for-opponent + share screen ──────────────────────────────────────

function WaitingScreen({
  result,
  me,
  isGhost,
}: {
  result: AsyncDuelResult;
  me: AsyncDuelSideResult;
  isGhost: boolean;
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(
    () => `${window.location.origin}/async/${result.code}`,
    [result.code],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied!');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const share = async () => {
    const text = `I scored ${me.score} on Arena. Beat that.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Arena Challenge', text, url: shareUrl });
      } else {
        await copy();
      }
    } catch {
      /* user dismissed the share sheet */
    }
  };

  return (
    <div className="flex min-h-svh flex-col" style={{ background: EMBER.base }}>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-5 pb-8 pt-10">
        <p
          className="text-center font-display text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: EMBER.textTertiary }}
        >
          Your run is in
        </p>
        <p
          className="mt-3 text-center font-display text-6xl font-bold"
          style={{ color: EMBER.accentBright }}
        >
          {me.score.toLocaleString()}
        </p>
        <p className="mt-1 text-center text-sm" style={{ color: EMBER.textSecondary }}>
          {me.correct} correct · points banked
        </p>

        {isGhost ? (
          // A ghost match should resolve instantly; if we somehow land here, poll.
          <div className="mt-10 flex flex-col items-center gap-3">
            <LoadingSpinner />
            <p className="text-sm" style={{ color: EMBER.textSecondary }}>
              Scoring the ghost run…
            </p>
          </div>
        ) : (
          <>
            <p className="mt-10 text-center text-sm" style={{ color: EMBER.textSecondary }}>
              Send this link to a friend. When they finish, you'll both see who won.
            </p>

            {/* Copyable link */}
            <button
              onClick={copy}
              className="clip-row mt-4 flex w-full items-center gap-3 px-4 py-3 text-left transition-all active:scale-[0.99]"
              style={{ background: EMBER.surface }}
            >
              <span className="min-w-0 flex-1 truncate font-mono text-sm" style={{ color: EMBER.textPrimary }}>
                {shareUrl}
              </span>
              <span style={{ color: copied ? EMBER.win : EMBER.accent }}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </span>
            </button>

            <button
              onClick={share}
              className="clip-card mt-3 flex h-14 w-full items-center justify-center gap-2 font-display text-base font-bold text-white transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(150deg, #E8893B, #C2541E)' }}
            >
              <Share2 size={18} /> Share challenge
            </button>

            {/* Code fallback */}
            <div className="mt-5 text-center">
              <p className="text-xs uppercase tracking-wider" style={{ color: EMBER.textTertiary }}>
                Match code
              </p>
              <p
                className="mt-1 font-mono text-xl font-bold tracking-widest"
                style={{ color: EMBER.accentBright }}
              >
                {result.code}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2">
              <LoadingSpinner size="sm" />
              <span className="text-xs" style={{ color: EMBER.textTertiary }}>
                Waiting for opponent…
              </span>
            </div>
          </>
        )}

        <div className="flex-1" />

        <button
          onClick={() => navigate('/')}
          className="mt-8 text-center text-sm font-medium"
          style={{ color: EMBER.textTertiary }}
        >
          Done for now
        </button>
      </div>
    </div>
  );
}

// ── Bits ──────────────────────────────────────────────────────────────────────

function ScoreCell({
  label,
  side,
  highlight,
  align = 'left',
}: {
  label: string;
  side: AsyncDuelSideResult;
  highlight: boolean;
  align?: 'left' | 'right';
}) {
  return (
    <div
      className="clip-card flex-1 p-4"
      style={{
        background: EMBER.surface,
        textAlign: align,
        boxShadow: highlight ? 'inset 0 0 0 1px rgba(240,176,90,0.45)' : 'none',
      }}
    >
      <p className="text-xs" style={{ color: EMBER.textTertiary }}>
        {label}
      </p>
      <p
        className="mt-1 font-display text-4xl font-bold tabular-nums"
        style={{ color: highlight ? EMBER.accentBright : EMBER.textPrimary }}
      >
        {side.score.toLocaleString()}
      </p>
      <p className="mt-0.5 text-xs" style={{ color: EMBER.textTertiary }}>
        {side.correct} correct
      </p>
    </div>
  );
}

function challengeModeLabel(mode: ChallengeMode): string {
  switch (mode) {
    case 'speed_math':
      return 'Speed Math';
    case 'brain_duel':
      return 'Brain Duel';
    default:
      return 'Duel';
  }
}

function resolutionLabel(r: string): string {
  switch (r) {
    case 'speed_tiebreak':
      return 'Decided on speed (tiebreak)';
    case 'sudden_death':
      return 'Decided in sudden death';
    case 'forfeit':
      return 'Won by forfeit';
    case 'draw':
      return 'Dead heat';
    default:
      return '';
  }
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center"
      style={{ background: EMBER.base }}
    >
      {children}
    </div>
  );
}
