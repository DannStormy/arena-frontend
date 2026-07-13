import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { useWallet, useTransactions } from '@/hooks/use-wallet';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Transaction, TransactionType } from '@/types/wallet.types';

const TYPE_LABEL: Record<TransactionType, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  entry_fee: 'Entry fee',
  prize_payout: 'Prize won',
  referral_bonus: 'Referral bonus',
};

function TransactionRow({ tx }: { tx: Transaction }) {
  const isCredit = ['deposit', 'prize_payout', 'referral_bonus'].includes(tx.type);

  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className={cn(
          'h-8 w-8 rounded-full flex items-center justify-center text-sm shrink-0',
          isCredit ? 'bg-arena-green/15 text-arena-green' : 'bg-arena-red/15 text-arena-red',
        )}
      >
        {isCredit ? '+' : '−'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">{TYPE_LABEL[tx.type]}</p>
        <p className="text-white/30 text-xs">{new Date(tx.createdAt).toLocaleDateString()}</p>
      </div>

      <span className={cn('text-sm font-semibold tabular-nums', isCredit ? 'text-arena-green' : 'text-arena-red')}>
        {isCredit ? '+' : '−'}₦{Number(tx.amount).toLocaleString()}
      </span>
    </div>
  );
}

export function WalletPage() {
  const [page, setPage] = useState(1);
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: txPage, isLoading: txLoading } = useTransactions(page);

  return (
    <div className="flex flex-col min-h-full bg-arena-bg">
      <PageHeader title="Wallet" />

      <div className="px-4 space-y-5 pb-6">
        {walletLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <div
            className="rounded-2xl p-5 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(232,137,59,0.20) 0%, rgba(28,20,14,1) 100%)',
              border: '1px solid rgba(232,137,59,0.30)',
            }}
          >
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Winnings balance</p>
            <p className="font-display text-5xl font-bold text-white mt-1">
              ₦{Number(wallet?.balance ?? 0).toLocaleString()}
            </p>

            <div className="flex justify-center gap-8 mt-5 text-sm">
              <div>
                <p className="text-white/30 text-xs uppercase tracking-wider">Won</p>
                <p className="font-display text-arena-green font-bold text-lg mt-0.5">
                  ₦{Number(wallet?.totalWon ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="w-px bg-arena-border" />
              <div>
                <p className="text-white/30 text-xs uppercase tracking-wider">Withdrawn</p>
                <p className="font-display text-arena-red font-bold text-lg mt-0.5">
                  ₦{Number(wallet?.totalSpent ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-3">Transactions</p>

          {txLoading && <LoadingSpinner className="mx-auto" />}

          {!txLoading && txPage && txPage.data.length === 0 && (
            <EmptyState title="No transactions yet" icon={<CreditCard />} />
          )}

          {txPage && txPage.data.length > 0 && (
            <div className="rounded-2xl bg-arena-surface border border-arena-border px-4 divide-y divide-arena-border/50">
              {txPage.data.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}

          {txPage && txPage.total > txPage.pageSize && (
            <div className="flex justify-center gap-3 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="border-arena-border text-white/60 hover:text-white hover:bg-white/5"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * txPage.pageSize >= txPage.total}
                onClick={() => setPage((p) => p + 1)}
                className="border-arena-border text-white/60 hover:text-white hover:bg-white/5"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
