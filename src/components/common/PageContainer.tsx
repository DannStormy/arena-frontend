import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  /** 'default' = 640px (detail pages), 'wide' = 760px (list pages) */
  size?: 'default' | 'wide';
  className?: string;
}

export function PageContainer({ children, size = 'default', className }: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4',
        size === 'wide' ? 'max-w-[760px]' : 'max-w-[640px]',
        className,
      )}
    >
      {children}
    </div>
  );
}
