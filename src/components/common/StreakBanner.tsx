import { Link } from 'react-router-dom';
import { EmberFlame } from '@/components/common/EmberFlame';
import { EMBER } from '@/lib/ember';
import type { StreakResponse } from '@/hooks/use-streak';

// Daily-streak indicator for the home screen. Three visual states:
//   • satisfied — playedToday: lit ember flame, "kept alive today"
//   • at-risk   — atRisk: pulsing warning nudge, links to a game
//   • idle      — a streak exists but today is open (encourage without alarm)
// Renders nothing when there's no streak to show and nothing at risk.
export function StreakBanner({ streak }: { streak: StreakResponse }) {
  const { currentDailyStreak, longestDailyStreak, playedToday, atRisk } = streak;

  // Nothing meaningful to surface — no active streak and no risk to warn about.
  if (currentDailyStreak <= 0 && !atRisk) return null;

  const lit = playedToday;
  // Calm, steady ember — hottest when kept alive today, cooling toward at-risk.
  const emberIntensity = lit ? 0.55 : atRisk ? 0.2 : 0.38;
  const tileBg = lit
    ? 'rgba(240,176,90,0.14)'
    : atRisk
      ? 'rgba(138,51,36,0.18)'
      : 'rgba(232,137,59,0.13)';

  const nudge = atRisk
    ? "Don't break the chain — play today"
    : lit
      ? 'Streak kept alive today'
      : 'Play today to keep it going';

  const nudgeColor = atRisk ? EMBER.lossInk : lit ? EMBER.accentBright : EMBER.accent;

  const body = (
    <div
      className="clip-row relative flex items-center gap-3 px-4 py-3 transition-opacity"
      style={{ background: EMBER.surface }}
    >
      {/* Accent bar — warm when safe/lit, crimson when at risk */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: atRisk ? EMBER.loss : lit ? EMBER.accentBright : EMBER.accent }}
      />
      <div
        className="flex items-center justify-center shrink-0"
        style={{ width: 40, height: 40, background: tileBg }}
      >
        <EmberFlame intensity={emberIntensity} size={24} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span
            className="font-display font-bold leading-none tabular-nums"
            style={{ fontSize: 26, color: EMBER.textPrimary }}
          >
            {currentDailyStreak}
          </span>
          <span
            className="font-display text-sm font-semibold"
            style={{ color: EMBER.textSecondary }}
          >
            day{currentDailyStreak === 1 ? '' : 's'}
          </span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: nudgeColor }}>
          {nudge}
        </p>
      </div>

      {longestDailyStreak > 0 && (
        <div className="shrink-0 text-right">
          <p
            className="font-display font-bold tabular-nums"
            style={{ fontSize: 15, color: EMBER.textPrimary }}
          >
            {longestDailyStreak}
          </p>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: EMBER.textTertiary }}>
            Best
          </p>
        </div>
      )}
    </div>
  );

  // When the chain is at risk, the whole banner becomes a CTA to go play.
  if (atRisk) {
    return (
      <Link to="/play/speed-math" className="block active:opacity-90">
        {body}
      </Link>
    );
  }
  return body;
}
