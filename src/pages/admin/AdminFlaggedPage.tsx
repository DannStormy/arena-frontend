import { useAdminFlagged, useClearFlag, useDisqualify } from '@/hooks/use-admin';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';

export function AdminFlaggedPage() {
  const { data: sessions, isLoading, error } = useAdminFlagged();
  const clearMutation = useClearFlag();
  const disqualifyMutation = useDisqualify();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-white text-xl font-bold">Flagged Sessions</h1>
        <p className="text-white/40 text-sm mt-0.5">{sessions?.length ?? 0} pending review</p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}
      {error && <ErrorMessage message="Failed to load flagged sessions." />}

      {sessions && sessions.length === 0 && (
        <p className="text-white/40 text-sm text-center py-12">No flagged sessions.</p>
      )}

      {sessions && sessions.length > 0 && (
        <div className="rounded-xl border border-arena-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-arena-border bg-arena-surface">
                <th className="text-left text-white/50 font-medium px-4 py-3">User</th>
                <th className="text-left text-white/50 font-medium px-4 py-3">Tournament</th>
                <th className="text-left text-white/50 font-medium px-4 py-3">Score</th>
                <th className="text-left text-white/50 font-medium px-4 py-3">Reason</th>
                <th className="text-right text-white/50 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const busy = clearMutation.isPending || disqualifyMutation.isPending;
                return (
                  <tr key={s.id} className="border-b border-arena-border/50 last:border-0">
                    <td className="px-4 py-3 text-white font-medium">{s.username}</td>
                    <td className="px-4 py-3 text-white/70">{s.tournamentTitle}</td>
                    <td className="px-4 py-3 text-white/70">{s.score}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-arena-red/10 text-arena-red">
                        {s.flagReason}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => clearMutation.mutate(s.id)}
                          disabled={busy}
                          className="text-xs text-green-400 hover:underline disabled:opacity-40"
                        >
                          Clear Flag
                        </button>
                        <button
                          onClick={() => disqualifyMutation.mutate(s.id)}
                          disabled={busy}
                          className="text-xs text-arena-red hover:underline disabled:opacity-40"
                        >
                          Disqualify
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
