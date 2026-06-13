import { MapPin, Dumbbell, Film, Brain, BookOpen, Cpu } from 'lucide-react';
import type { TournamentArena } from '@/types/tournament.types';

export const ARENA_LUCIDE_ICONS: Record<TournamentArena, React.ReactNode> = {
  naija_street_smarts: <MapPin   size={14} />,
  sports_arena:        <Dumbbell size={14} />,
  entertainment_zone:  <Film     size={14} />,
  brain_box:           <Brain    size={14} />,
  faith_and_values:    <BookOpen size={14} />,
  tech_and_hustle:     <Cpu      size={14} />,
};
