import { useState } from 'react';
import { useWallet, useTransactions } from '@/hooks/use-wallet';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">{TYPE_LABEL[tx.type]}</p>
        <p className="text-white/40 text-xs">{new Date(tx.createdAt).toLocaleDateString()}</p>
      </div>

      <span
        className={cn(
          'text-sm font-semibold',
          isCredit ? 'text-arena-green' : 'text-arena-red',
        )}
      >
        {isCredit ? '+' : '-'}₦{Number(tx.amount).toLocaleString()}
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

      <div className="px-4 space-y-5">
        {walletLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="rounded-xl bg-arena-surface border border-arena-border p-5 text-center">
            <p className="text-white/50 text-sm">Balance</p>
            <p className="text-4xl font-bold text-white mt-1">
              ₦{Number(wallet?.balance ?? 0).toLocaleString()}
            </p>

            <div className="flex justify-center gap-8 mt-4 text-sm">
              <div>
                <p className="text-white/40">Won</p>
                <p className="text-arena-green font-semibold">
                  ₦{Number(wallet?.totalWon ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-white/40">Spent</p>
                <p className="text-arena-red font-semibold">
                  ₦{Number(wallet?.totalSpent ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-white font-semibold mb-2">Transactions</h2>

          {txLoading && <LoadingSpinner className="mx-auto" />}

          {!txLoading && txPage && txPage.data.length === 0 && (
            <EmptyState title="No transactions yet" icon="💳" />
          )}

          {txPage && txPage.data.length > 0 && (
            <div className="rounded-xl bg-arena-surface border border-arena-border px-4 divide-y divide-arena-border">
              {txPage.data.map((tx, i) => (
                <div key={tx.id}>
                  <TransactionRow tx={tx} />
                  {i < txPage.data.length - 1 && <Separator className="bg-arena-border" />}
                </div>
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
                className="border-arena-border text-white hover:bg-white/10"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * txPage.pageSize >= txPage.total}
                onClick={() => setPage((p) => p + 1)}
                className="border-arena-border text-white hover:bg-white/10"
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
