import API from './api';
import type { Pagination, ReturnRequest, ReturnStatus, SellerReturnDetail } from '../types';

export interface ReturnListData {
  returns: ReturnRequest[];
  pagination: Pagination;
}

export interface ReturnListQuery {
  page?: number;
  limit?: number;
  status?: 'all' | ReturnStatus;
  search?: string;
  sortBy?: 'requested_at' | 'status' | 'product_name' | 'customer_name';
  sortOrder?: 'asc' | 'desc';
}

export const returnService = {
  create: async (itemId: string, quantity: number, reason: string): Promise<ReturnRequest> => {
    const response: any = await API.post(`/orders/items/${itemId}/returns`, {
      quantity,
      reason,
    });
    return response.data?.return || response.return;
  },

  getMine: async (query: ReturnListQuery = {}): Promise<ReturnListData> => {
    const response: any = await API.get('/me/returns', { params: query });
    return response.data || response;
  },

  getSellerReturns: async (query: ReturnListQuery = {}): Promise<ReturnListData> => {
    const response: any = await API.get('/seller/returns', { params: query });
    return response.data || response;
  },

  getSellerReturn: async (returnId: string): Promise<SellerReturnDetail> => {
    const response: any = await API.get(`/seller/returns/${returnId}`);
    return response.data || response;
  },

  updateSellerReturn: async (
    returnId: string,
    status: 'accepted' | 'rejected' | 'item_returned',
    sellerResponse?: string,
  ): Promise<ReturnRequest> => {
    const response: any = await API.patch(`/seller/returns/${returnId}`, {
      status,
      sellerResponse,
    });
    return response.data?.return || response.return;
  },
};
