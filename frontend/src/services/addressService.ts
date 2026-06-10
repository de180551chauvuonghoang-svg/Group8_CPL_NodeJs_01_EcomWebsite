import API from './api';

export interface Address {
  id: string;
  user_id: string;
  recipient_name: string;
  phone_number: string;
  street_address: string;
  city: string;
  is_default: boolean;
}

export const addressService = {
  getAddresses: async (): Promise<Address[]> => {
    const response: any = await API.get('/addresses');
    return response.data?.data || response.data || [];
  },

  addAddress: async (data: Omit<Address, 'id' | 'user_id'>): Promise<Address> => {
    const response: any = await API.post('/addresses', data);
    return response.data?.data || response.data;
  },

  updateAddress: async (id: string, data: Omit<Address, 'id' | 'user_id'>): Promise<Address> => {
    const response: any = await API.put(`/addresses/${id}`, data);
    return response.data?.data || response.data;
  },

  deleteAddress: async (id: string): Promise<boolean> => {
    await API.delete(`/addresses/${id}`);
    return true;
  },

  setDefault: async (id: string): Promise<boolean> => {
    await API.put(`/addresses/${id}/default`);
    return true;
  }
};
