import API from './api';
import type {
  Pagination,
  SellerWalletOverview,
  SellerWithdrawal,
  WalletTransaction,
  WalletTransactionFilter,
  WithdrawalStatusFilter,
} from '../types';

const emptyPagination: Pagination = { page: 1, limit: 20, total: 0, total_pages: 0 };

export interface WalletTransactionQuery {
  type?: WalletTransactionFilter;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface WithdrawalQuery {
  status?: WithdrawalStatusFilter;
  page?: number;
  limit?: number;
}

export const walletService = {
  getWallet: async (): Promise<SellerWalletOverview> => {
    const response: any = await API.get('/seller/wallet');
    return response.data || response;
  },

  getTransactions: async (
    query: WalletTransactionQuery = {},
  ): Promise<{ transactions: WalletTransaction[]; pagination: Pagination }> => {
    const response: any = await API.get('/seller/wallet/transactions', { params: query });
    const data = response.data || response;
    return {
      transactions: data.transactions || [],
      pagination: data.pagination || emptyPagination,
    };
  },

  getWithdrawals: async (
    query: WithdrawalQuery = {},
  ): Promise<{ withdrawals: SellerWithdrawal[]; pagination: Pagination }> => {
    const response: any = await API.get('/seller/withdrawals', { params: query });
    const data = response.data || response;
    return {
      withdrawals: data.withdrawals || [],
      pagination: data.pagination || emptyPagination,
    };
  },

  createWithdrawal: async (payload: {
    amount: number;
    sellerNote?: string;
  }): Promise<SellerWithdrawal> => {
    const response: any = await API.post('/seller/withdrawals', payload);
    return response.data?.withdrawal || response.withdrawal;
  },

  cancelWithdrawal: async (withdrawalId: string): Promise<SellerWithdrawal> => {
    const response: any = await API.patch(`/seller/withdrawals/${withdrawalId}/cancel`);
    return response.data?.withdrawal || response.withdrawal;
  },
};
