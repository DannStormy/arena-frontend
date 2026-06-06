export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'entry_fee'
  | 'prize_payout'
  | 'referral_bonus';

export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface WalletSummary {
  balance: string;
  totalWon: string;
  totalSpent: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: string;
  status: TransactionStatus;
  description: string;
  createdAt: string;
}

export interface TransactionPage {
  data: Transaction[];
  total: number;
  page: number;
  pageSize: number;
}
