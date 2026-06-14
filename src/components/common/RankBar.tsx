// RankBar — season rank progress bar. Use in hero block and profile season section.
import { getTierFromName, RANK_TIERS } from './RankBadge';

interface RankBarProps {
  rank: string;
  points: number;
  nextAt: number;
  floor?: number;
  className?: string;
}

export function RankBar({ rank, points, nextAt, floor = 0, className }: RankBarProps) {
  const tier = getTierFromName(rank);
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
      <div className="h-[3px] rounded-full bg-arena-elev overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: `${tier.color}CC` }}
        />
      </div>
    </div>
  );
}
