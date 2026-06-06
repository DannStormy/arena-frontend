import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
  className?: string;
}

export function EmptyState({ title, description, icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}>
      {icon && <span className="text-4xl">{icon}</span>}
      <p className="text-white font-medium">{title}</p>
      {description && <p className="text-white/50 text-sm max-w-xs">{description}</p>}
    </div>
  );
}
