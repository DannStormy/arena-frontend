import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useOnline } from '@/hooks/use-online';
import { useAuthStore } from '@/stores/auth.store';
import { drainOfflineXp, pendingXpCount } from '@/lib/offline-xp-queue';

/**
 * Drains the banked offline-XP queue whenever we're online + logged in — on
 * mount (app opened online with a pending queue) and when the connection
 * returns (useOnline flips true). Refreshes the progression cache + toasts on a
 * successful sync. Mount once, high in the tree.
 */
export function useOfflineXpSync(): void {
  const online = useOnline();
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!online || !token || pendingXpCount() === 0) return;
    let cancelled = false;
    void drainOfflineXp().then((n) => {
      if (cancelled || n <= 0) return;
      // Level/XP moved server-side — refresh anything reading progression.
      void queryClient.invalidateQueries({ queryKey: ['progression'] });
      toast.success(`Synced ${n} offline answer${n === 1 ? '' : 's'} — XP added to your level.`);
    });
    return () => {
      cancelled = true;
    };
  }, [online, token, queryClient]);
}
