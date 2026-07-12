import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  className?: string;
}

/**
 * Segmented control with active state baked in (brand-accent pill).
 * Uses base-ui's data-active attribute pattern — data-active:* selectors.
 */
export function SegmentedControl({ value, onValueChange, options, className }: SegmentedControlProps) {
  return (
    <div
      className={cn(
        'inline-flex flex-nowrap items-center gap-1 rounded-xl bg-arena-surface border border-arena-border p-1',
        className,
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1 shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              isActive
                ? 'bg-arena-accent text-white'
                : 'text-arena-text-tertiary hover:text-arena-text-secondary',
            )}
          >
            {opt.icon && <span className="flex items-center">{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
