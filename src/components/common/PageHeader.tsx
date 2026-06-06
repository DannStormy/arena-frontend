import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  className?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, showBack = false, className, action }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className={cn('flex items-center gap-3 px-4 py-4', className)}>
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="p-1 -ml-1 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <h1 className="flex-1 text-lg font-semibold text-white">{title}</h1>
      {action}
    </header>
  );
}
