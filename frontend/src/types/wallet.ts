export interface SellerWallet {
  id: string;
  sellerId: string;
  availableBalance: number;
  pendingBalance: number;
  withdrawalHoldBalance: number;
  withdrawnTotal: number;
  lifetimeEarnings: number;
  createdAt: string;
  updatedAt: string;
}

export interface SellerWalletBankInfo {
  bankName: string | null;
  accountHolder: string | null;
  maskedAccountNo: string | null;
}

export interface SellerWalletOverview {
  wallet: SellerWallet;
  bankInfo: SellerWalletBankInfo;
  minimumWithdrawalAmount: number;
  holdDays: number;
}

export type WalletTransactionType =
  | 'sale_pending'
  | 'sale_released'
  | 'sale_reversed'
  | 'withdrawal_hold'
  | 'withdrawal_approved'
  | 'withdrawal_rejected'
  | 'withdrawal_cancelled';

export type WalletTransactionFilter = 'all' | WalletTransactionType;

export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  amount: number;
  referenceType: string | null;
  referenceId: string | null;
  availableAt: string | null;
  description: string | null;
  createdAt: string;
}

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type WithdrawalStatusFilter = 'all' | WithdrawalStatus;

export interface SellerWithdrawal {
  id: string;
  sellerId: string;
  amount: number;
  status: WithdrawalStatus;
  bankName: string;
  maskedAccountNo: string;
  accountHolder: string;
  sellerNote: string | null;
  adminNote: string | null;
  processedBy: string | null;
  requestedAt: string;
  processedAt: string | null;
}
