// RankBar — season rank progress bar. Use in hero block and profile season section.
import { RANK_TIERS } from './RankBadge';

interface RankBarProps {
  rank: string;
  points: number;
  nextAt: number;
  floor?: number;
  className?: string;
}

export function RankBar({ rank, points, nextAt, floor = 0, className }: RankBarProps) {
  const range = Math.max(nextAt - floor, 1);
  const pct = Math.min(Math.max(((points - floor) / range) * 100, 0), 100);

  // RANK_TIERS is ordered highest → lowest; so index - 1 is the next tier to achieve
  const tierIdx = RANK_TIERS.findIndex((t) => t.name.toLowerCase() === rank.toLowerCase());
  const nextTier = tierIdx > 0 ? RANK_TIERS[tierIdx - 1] : null;
  const ptsToNext = nextAt > points ? nextAt - points : 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-arena-text-secondary font-medium">{rank}</span>
        {nextTier ? (
          <span className="text-[11px] text-arena-text-tertiary tabular-nums">
            {ptsToNext.toLocaleString()} to {nextTier.name}
          </span>
        ) : (
          <span className="text-[11px] text-arena-text-tertiary">Max rank</span>
        )}
      </div>
      <div
        className="h-[3px] overflow-hidden"
        style={{ background: 'rgba(232,137,59,0.10)', borderRadius: 99 }}
      >
        <div
          className="h-full"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #C2541E, #E8893B)', borderRadius: 99 }}
        />
      </div>
    </div>
  );
}
