import { Brain, Zap, Skull, Flame, ArrowLeftRight } from 'lucide-react';
import type { DuelMode } from '@/types/duel.types';

const MODE_CONFIG: Record<DuelMode, { icon: React.ReactNode; accent: string }> = {
  trivia:       { icon: <Brain />,            accent: '#4F9CF0' },
  blitz:        { icon: <Zap />,              accent: '#F5B73D' },
  sudden_death: { icon: <Skull />,            accent: '#FF7043' },
  streak:       { icon: <Flame />,            accent: '#E254A8' },
  steal:        { icon: <ArrowLeftRight />,   accent: '#3FB6C9' },
};

interface ModeIconProps {
  mode: DuelMode | string;
  /** Icon tile size in px (outer square). Default 26. */
  size?: number;
  /** Icon size passed to lucide. Default 13. */
  iconSize?: number;
}

/** Square tile — categorical accent background + lucide icon. */
export function ModeIcon({ mode, size = 26, iconSize = 13 }: ModeIconProps) {
  const cfg = MODE_CONFIG[mode as DuelMode];
  if (!cfg) return null;

  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: `${cfg.accent}1F`,
        borderRadius: 7,
        color: cfg.accent,
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
export function ModeIconInline({ mode, size = 14 }: { mode: DuelMode | string; size?: number }) {
  const cfg = MODE_CONFIG[mode as DuelMode];
  if (!cfg) return null;
  return (
    <span
      style={{ color: cfg.accent, display: 'inline-flex', width: size, height: size }}
      className="[&_svg]:w-full [&_svg]:h-full"
    >
      {cfg.icon}
    </span>
  );
}

export function getModeAccent(mode: DuelMode | string): string {
  return MODE_CONFIG[mode as DuelMode]?.accent ?? '#76767F';
}
