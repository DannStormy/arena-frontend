import { MapPin, Dumbbell, Film, Brain, BookOpen, Cpu } from 'lucide-react';
import type { TournamentArena } from '@/types/tournament.types';

// Map: arena key → lucide icon element at the canonical 14px size.
// Use <ArenaIcon> component for a styled wrapper; use this map for raw icons.
export const ARENA_LUCIDE_ICONS: Record<TournamentArena, React.ReactNode> = {
  naija_street_smarts: <MapPin   size={14} />,
  sports_arena:        <Dumbbell size={14} />,
  entertainment_zone:  <Film     size={14} />,
  brain_box:           <Brain    size={14} />,
  faith_and_values:    <BookOpen size={14} />,
  tech_and_hustle:     <Cpu      size={14} />,
};

interface ArenaIconProps {
  arena: TournamentArena | string;
  size?: number;
}

/** Inline arena icon at a given size. Falls back to nothing for unknown arenas. */
export function ArenaIcon({ arena, size = 14 }: ArenaIconProps) {
  const icons: Record<string, React.ReactNode> = {
    naija_street_smarts: <MapPin   size={size} />,
    sports_arena:        <Dumbbell size={size} />,
    entertainment_zone:  <Film     size={size} />,
    brain_box:           <Brain    size={size} />,
    faith_and_values:    <BookOpen size={size} />,
    tech_and_hustle:     <Cpu      size={size} />,
  };
  const icon = icons[arena];
  if (!icon) return null;
  return <span className="inline-flex items-center">{icon}</span>;
}
