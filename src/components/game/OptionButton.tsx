// OptionButton — answer option for duel and tournament game screens.
// State machine: default → selected (pre-reveal) → correct|wrong (post-reveal).
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as haptics from '@/lib/haptics';

// Ember-only reveal colours (no cold green): correct = win amber, wrong = crimson.
const CORRECT = '#F0B05A';
const WRONG = '#FF4D5E';

interface OptionButtonProps {
  letter: string;
  label: string;
  isSelected: boolean;
  isCorrect: boolean;
  isWrong: boolean;
  isDisabled: boolean;
  onClick: () => void;
  modeAccent: string;
}

export function OptionButton({
  letter, label, isSelected, isCorrect, isWrong, isDisabled, onClick, modeAccent,
}: OptionButtonProps) {
  const revealed = isCorrect || isWrong;

  const containerStyle: React.CSSProperties = isCorrect
    ? { borderColor: CORRECT, background: 'rgba(240,176,90,0.12)' }
    : isWrong
    ? { borderColor: WRONG, background: 'rgba(255,77,94,0.10)' }
    : isSelected
    ? { borderColor: modeAccent, background: `${modeAccent}14` }
    : {};

  const badgeStyle: React.CSSProperties = isCorrect
    ? { background: 'rgba(240,176,90,0.20)', color: CORRECT }
    : isWrong
    ? { background: 'rgba(255,77,94,0.20)', color: WRONG }
    : isSelected && !revealed
    ? { background: `${modeAccent}22`, color: modeAccent }
    : {};

  return (
    <button
      onClick={() => {
        if (isDisabled) return;
        haptics.tap();
        onClick();
      }}
      disabled={isDisabled}
      className={cn(
        // press-key gives the firm squash + ember flash while the option is live
        // (it only fires on :not(:disabled), i.e. pre-reveal).
        'press-key w-full flex items-center gap-3 rounded-xl border p-3.5 text-left',
        'disabled:cursor-default',
        revealed || isSelected
          ? 'border-transparent'
          : 'border-arena-border bg-arena-surface hover:border-white/20 hover:bg-arena-elev',
        isDisabled && !revealed && !isSelected && 'opacity-40',
      )}
      style={containerStyle}
    >
      {/* Letter / reveal icon */}
      <span
        className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center font-display font-bold text-xs bg-arena-elev text-white/40"
        style={badgeStyle}
      >
        {isCorrect ? <Check className="h-3.5 w-3.5" /> :
         isWrong   ? <X className="h-3.5 w-3.5" /> :
         letter}
      </span>

      <span
        className={cn(
          'flex-1 text-sm leading-snug',
          isCorrect ? 'text-white font-medium'     :
          isWrong   ? 'text-white/40'              :
          isSelected ? 'text-white font-medium'    :
          'text-arena-text-secondary',
        )}
      >
        {label}
      </span>
    </button>
  );
}
