import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Pass a ReactNode (lucide icon, etc.). Emoji strings still accepted for backwards-compat. */
  icon?: React.ReactNode;
  cta?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ title, description, icon, cta, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}>
      {icon && (
        <span className="text-arena-text-tertiary flex items-center justify-center [&_svg]:h-8 [&_svg]:w-8">
          {icon}
        </span>
      )}
      <p className="text-arena-text-primary font-semibold font-display">{title}</p>
      {description && <p className="text-arena-text-tertiary text-sm max-w-xs">{description}</p>}
      {cta && (
        <button
          onClick={cta.onClick}
          className="mt-1 text-sm text-arena-purple-bright font-medium hover:underline transition-colors"
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
