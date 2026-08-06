import API from './api';
import type { FinanceSummary, FinanceTransaction, Pagination } from '../types';

export interface FinanceQuery {
  from?: string;
  to?: string;
}

export interface FinanceTransactionQuery extends FinanceQuery {
  page?: number;
  limit?: number;
  status?: 'all' | 'sale' | 'return';
  search?: string;
}

export const financeService = {
  getSummary: async (query: FinanceQuery = {}): Promise<FinanceSummary> => {
    const response: any = await API.get('/seller/finance/summary', { params: query });
    return response.data || response;
  },

  getTransactions: async (
    query: FinanceTransactionQuery = {},
  ): Promise<{ transactions: FinanceTransaction[]; pagination: Pagination }> => {
    const response: any = await API.get('/seller/finance/transactions', { params: query });
    return response.data || response;
  },
};
