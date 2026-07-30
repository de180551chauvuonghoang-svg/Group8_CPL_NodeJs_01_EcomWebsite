import API from './api';
import type { UploadedImage } from '../types';

export type UploadPurpose = UploadedImage['purpose'];
export type UploadScope = 'seller' | 'application';

const getUploadPath = (scope: UploadScope) =>
  scope === 'application' ? '/seller/application/uploads/images' : '/uploads/images';

export const uploadService = {
  uploadImage: async (file: File, purpose: UploadPurpose): Promise<UploadedImage> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', purpose);

    const response: any = await API.post('/uploads/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data || response;
  },

  deleteImage: async (publicId: string): Promise<void> => {
    await API.delete('/uploads/images', { data: { publicId } });
  },

  uploadApplicationImage: async (
    file: File,
    purpose: Extract<UploadPurpose, 'shop_logo' | 'shop_cover'>,
  ): Promise<UploadedImage> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', purpose);

    const response: any = await API.post(getUploadPath('application'), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data || response;
  },

  deleteApplicationImage: async (publicId: string): Promise<void> => {
    await API.delete(getUploadPath('application'), { data: { publicId } });
  },
};
