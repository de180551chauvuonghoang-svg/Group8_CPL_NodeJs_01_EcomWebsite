import API from './api';
import type { UploadedImage } from '../types';

export type UploadPurpose = UploadedImage['purpose'];

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
};
