import API from './api';

// Endpoint chung (đã có sẵn cho avatar) — nhận base64 Data URI, trả về URL Cloudinary vĩnh viễn.
// Yêu cầu backend/.env có CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET thật (không phải placeholder).
export const uploadService = {
  uploadImage: async (base64Image: string): Promise<string> => {
    const response: any = await API.post('/auth/upload', { image: base64Image });
    const data = response.data || response;
    if (!data?.secure_url) {
      throw new Error('Không nhận được URL ảnh từ server.');
    }
    return data.secure_url;
  }
};
