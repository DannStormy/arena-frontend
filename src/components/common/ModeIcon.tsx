import { Brain, Zap, Skull, Flame, ArrowLeftRight } from 'lucide-react';
import type { DuelMode } from '@/types/duel.types';

const MODE_CONFIG: Record<DuelMode, { icon: React.ReactNode; accent: string }> = {
  trivia:       { icon: <Brain />,           accent: '#E8893B' }, // ember — base mode
  blitz:        { icon: <Zap />,             accent: '#F5B73D' }, // amber — burns faster
  sudden_death: { icon: <Skull />,           accent: '#FF7043' }, // crimson — elimination
  streak:       { icon: <Flame />,           accent: '#E254A8' }, // pink — chain energy
  steal:        { icon: <ArrowLeftRight />,  accent: '#C08050' }, // copper — metallic warmth
};

interface ModeIconProps {
  mode: DuelMode | string;
  /** Icon tile size in px (outer square). Default 26. */
  size?: number;
  /** Icon size passed to lucide. Default 13. */
  iconSize?: number;
  /** Override the built-in mode accent (e.g. for themed pages). */
  accent?: string;
  /** Apply clip-chip grammar instead of rounded corners. */
  clip?: boolean;
}

/** Square tile — categorical accent background + lucide icon. */
export function ModeIcon({ mode, size = 26, iconSize = 13, accent, clip = false }: ModeIconProps) {
  const cfg = MODE_CONFIG[mode as DuelMode];
  if (!cfg) return null;
  const color = accent ?? cfg.accent;

  return (
    <div
      className={`flex items-center justify-center shrink-0${clip ? ' clip-chip' : ''}`}
      style={{
        width: size,
        height: size,
        background: `${color}1F`,
        borderRadius: clip ? undefined : 7,
        color,
      }}
    >
      <span
        style={{ display: 'flex', width: iconSize, height: iconSize }}
        className="[&_svg]:w-full [&_svg]:h-full"
      >
        {cfg.icon}
      </span>
    </div>
  );
}

/** Inline icon only (no tile background), for compact contexts. */
export function ModeIconInline({
  mode,
  size = 14,
  accent,
}: {
  mode: DuelMode | string;
  size?: number;
  accent?: string;
}) {
  const cfg = MODE_CONFIG[mode as DuelMode];
  if (!cfg) return null;
  const color = accent ?? cfg.accent;
  return (
    <span
      style={{ color, display: 'inline-flex', width: size, height: size }}
      className="[&_svg]:w-full [&_svg]:h-full"
    >
      {cfg.icon}
    </span>
  );
}

export function getModeAccent(mode: DuelMode | string): string {
  return MODE_CONFIG[mode as DuelMode]?.accent ?? '#76767F';
}
