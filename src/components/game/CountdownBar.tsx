// CountdownBar — drains as timeLeft decreases. Color shifts from modeAccent → amber → loss-red
// under urgency. Displays only; does NOT own or reimplement timing logic.
import { cn } from '@/lib/utils';

interface CountdownBarProps {
  timeLeft: number | null;
  timerMax: number;
  modeAccent: string;
  /** Blitz mode makes the bar taller to reinforce urgency. */
  isBlitz?: boolean;
}

export function CountdownBar({ timeLeft, timerMax, modeAccent, isBlitz = false }: CountdownBarProps) {
  if (timeLeft === null) return null;

  const pct     = Math.max((timeLeft / timerMax) * 100, 0);
  const isUrgent = pct <= 30;
  const isDanger = pct <= 15;

  const barColor = isDanger ? '#FF4D5E' : isUrgent ? '#F5B73D' : modeAccent;

  return (
    <div className={cn('w-full overflow-hidden bg-white/5', isBlitz ? 'h-2' : 'h-[3px]')}>
      <div
        className={cn('h-full rounded-r-full', isDanger && 'motion-safe:animate-pulse')}
        style={{
          width:      `${pct}%`,
          background: barColor,
          transition: 'width 1s linear, background-color 0.4s ease',
        }}
      />
    </div>
  );
}
