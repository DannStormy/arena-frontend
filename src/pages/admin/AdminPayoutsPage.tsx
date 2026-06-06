import { useAdminPayouts, useTriggerPayout } from '@/hooks/use-admin';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Button } from '@/components/ui/button';

export function AdminPayoutsPage() {
  const { data: payouts, isLoading, error } = useAdminPayouts();
  const triggerMutation = useTriggerPayout();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-white text-xl font-bold">Payouts</h1>
        <p className="text-white/40 text-sm mt-0.5">{payouts?.length ?? 0} pending</p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}
      {error && <ErrorMessage message="Failed to load payouts." />}

      {payouts && payouts.length === 0 && (
        <p className="text-white/40 text-sm text-center py-12">No pending payouts.</p>
      )}

      {payouts && payouts.length > 0 && (
        <div className="rounded-xl border border-arena-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-arena-border bg-arena-surface">
                <th className="text-left text-white/50 font-medium px-4 py-3">Winner</th>
                <th className="text-left text-white/50 font-medium px-4 py-3">Bank details</th>
                <th className="text-left text-white/50 font-medium px-4 py-3">Tournament</th>
                <th className="text-left text-white/50 font-medium px-4 py-3">Amount</th>
                <th className="text-right text-white/50 font-medium px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-arena-border/50 last:border-0">
                  <td className="px-4 py-3 text-white font-medium">{p.username}</td>
                  <td className="px-4 py-3">
                    <p className="text-white/70">{p.bankAccountName}</p>
                    <p className="text-white/40 text-xs">{p.bankName} · {p.bankAccountNumber}</p>
                  </td>
                  <td className="px-4 py-3 text-white/70">{p.tournamentTitle}</td>
                  <td className="px-4 py-3 text-arena-gold font-semibold">
                    ₦{Number(p.amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      onClick={() => triggerMutation.mutate(p.id)}
                      disabled={triggerMutation.isPending}
                      className="bg-arena-gold hover:bg-arena-gold/90 text-black font-semibold text-xs h-7"
                    >
                      Trigger Payout
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
