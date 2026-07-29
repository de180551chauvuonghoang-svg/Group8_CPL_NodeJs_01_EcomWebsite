import API from './api';
import {
  InventoryAdjustmentResult,
  InventoryLogsData,
  InventoryType,
  LowStockInventoryData,
  SellerInventoryAdjustmentType,
  SellerProductVariant,
} from '../types';

export interface InventoryLogQuery {
  variantId?: string;
  type?: InventoryType | '';
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AdjustInventoryPayload {
  variantId: string;
  changeQuantity: number;
  type: SellerInventoryAdjustmentType;
  reason: string;
}

export const inventoryService = {
  getLowStock: async (page = 1, limit = 20): Promise<LowStockInventoryData> => {
    const response: any = await API.get('/seller/inventory/low-stock', {
      params: { page, limit },
    });
    return response.data;
  },

  getLogs: async (query: InventoryLogQuery = {}): Promise<InventoryLogsData> => {
    const response: any = await API.get('/seller/inventory/logs', { params: query });
    return response.data;
  },

  adjust: async (payload: AdjustInventoryPayload): Promise<InventoryAdjustmentResult> => {
    const response: any = await API.post('/seller/inventory/adjust', payload);
    return response.data;
  },

  updateStockAlert: async (
    productId: string,
    variantId: string,
    lowStockThreshold: number,
  ): Promise<SellerProductVariant> => {
    const response: any = await API.patch(
      `/seller/products/${productId}/variants/${variantId}/stock-alert`,
      { lowStockThreshold },
    );
    return response.data?.variant;
  },
};
