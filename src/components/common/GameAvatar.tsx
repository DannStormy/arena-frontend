import { cn } from '@/lib/utils';

interface Props {
  username: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  isMe?: boolean;
}

const sizeMap = {
  sm: { wrap: 'h-8 w-8', text: 'text-xs' },
  md: { wrap: 'h-12 w-12', text: 'text-sm' },
  lg: { wrap: 'h-16 w-16', text: 'text-base' },
};

export function GameAvatar({ username, avatarUrl, size = 'md', isMe }: Props) {
  const { wrap, text } = sizeMap[size];
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <div className={cn('relative shrink-0', wrap)}>
      <div
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden rounded-full',
          isMe
            ? 'ring-2 ring-arena-accent/60 bg-arena-accent animate-your-turn'
            : 'ring-1 ring-arena-border bg-arena-neutral-fill',
        )}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
        ) : (
          <span className={cn('font-bold text-white', text)}>{initials}</span>
        )}
      </div>
    </div>
  );
}
