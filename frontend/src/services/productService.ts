import API from './api';
import { Product } from '../types';

export interface ProductFilterParams {
  category?: string;
  search?: string;
  brand?: string;
}

export interface BrandOption {
  id: string;
  name: string;
  logo_url?: string;
}

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
}

const CATEGORY_ALIASES: Record<string, string[]> = {
  'am-thanh': ['Audio', 'Âm Thanh'],
  'dong-ho-wear': ['Wearables', 'Thiết Bị Đeo'],
  'dien-tu': ['Electronics', 'Điện Tử'],
  'phu-kien': ['Accessories', 'Phụ Kiện'],
  'nha-bep': ['Home & Kitchen', 'Nhà & Bếp'],
};

const matchesCategory = (product: Product, category: string) => {
  const values = [category, ...(CATEGORY_ALIASES[category] || [])].map(v => v.toLowerCase());
  return values.includes((product.category || '').toLowerCase())
    || values.includes((product.category_slug || '').toLowerCase());
};

const fallbackProducts: Product[] = [
  {
    id: 'mock-p-1',
    name: 'Tai Nghe Volitify Studio Pro',
    description: 'Tai nghe không dây ANC thế hệ mới với màng loa Titanium cao cấp và thời lượng pin 40 giờ liên tục.',
    price: 4200000,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLpySGFG5rPGzS82qFoM8kxMy0vqEz-V-mOaoiPe4Wqf6LMkWJ1uBc6ABbOBWXMR3GiYh8zJk6imhRujekEOSGtsyZFZXMTOTkm-iaZs6JCjnEUqrnZQC7SFCnhb0qoKkPC1I_vfdGDcnbki4FwvPq_Qpcl5S810AG_gT1yDnEEdxqydps5sDP4K-Z6Wv9AykTdJ-sLkdYKlFjPRIH6a0jZLowOO90Az4So_h8m6B2thUsYzDGOLKnxUZ5aKyBMiBtksK6WwfhBr8t',
    category: 'Audio',
    rating: 4.8,
    stock: 15
  },
  {
    id: 'mock-p-2',
    name: 'Đồng Hồ Thông Minh Volitify X',
    description: 'Thiết kế kim loại nguyên khối sang trọng, tích hợp cảm biến đo nhịp tim, nồng độ oxy trong máu và hỗ trợ tập luyện 100 môn thể thao.',
    price: 2850000,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHN9K-wEgsWJBGPJO55HBlCKBissNv5Jdslbk7sgVkXuAcLGKxaaeX-VGlSDelaOZPMMum6UUruJ8cxzgbsA_DJKjgpN-efHNM9_VgOxFYO1VbU3qNJ730Y3OxImmLI7WUcmgL5f3u65XdikaV9oONQeyYC_XR_2ghst7ZjnsBXqRqHHC9XB5CGp0OcHyJjkHwWUylRmc8Ai8I-032efWvhwkCV_EZbkWb2HqbG7yjUHTfuadiCX1DIt1O32rjDv0YiIP4ajCz7zm_',
    category: 'Wearables',
    rating: 4.6,
    stock: 40
  },
  {
    id: 'mock-p-3',
    name: 'Máy Tính Bảng Volitify Pad Pro',
    description: 'Màn hình OLED 120Hz siêu mượt, chip xử lý đa nhân mạnh mẽ tối ưu cho thiết kế đồ họa và giải trí hiệu năng cao.',
    price: 12500000,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC30Ql3T_QZtf5AKA9UHrS59pVuCy5rG0Xbl-gsYHwEf77lo7ZK6RbpkKOctLLyb8YgHQloIxkntAByGmeacB_bclWMD7gJI0Xh_3wBR6XmZ7_SLeq-Tt6zagNG2NNrlWgbbfaoIZMBDzIRqNGdqJFAYOZdIRHlViKtuBPmBxZq-mb3nf_x1-F8hDzYQom-2M3H98vKJDxNgypE71CWCsqopJflpRGe1yLQjIVk1CqbYAxp7H5tRWZF8cKtc95dacMkR742ayfP0wEZ',
    category: 'Electronics',
    rating: 4.9,
    stock: 3
  },
  {
    id: 'mock-p-4',
    name: 'Volitify Buds Elite',
    description: 'Tai nghe True Wireless siêu nhỏ gọn, âm thanh chuẩn Hi-Res Audio, hộp sạc hỗ trợ sạc không dây chuẩn Qi tiện lợi.',
    price: 3150000,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAZm2Q1VLXf6sqjrvr8VFMW-TluXKObJsYXlgVbDWIScKTTOrVaAxznE2iF_2gMgax6JFEdP2dbswvfivqOORzJcqM1cqAELGaBHl-WOV_BAPkN-SQS4Sr9eMl6LWw1C3xbBnD9fpb-csfHa01bs6z8XCcxMT9_xaI74JlTH024JvMq5yNfZWkEgnKSGu7HO3uCNcnweu8Eij-wE_nroSCCcP-aADQtG56QCicxg4Uv0LWfpXdNV3lhmUIfkVqKETmPSy2aaf3GFfGu',
    category: 'Audio',
    rating: 4.7,
    stock: 25
  },
  {
    id: 'mock-p-5',
    name: 'Lò Nướng Thông Minh Volitify Wave',
    description: 'Công nghệ đối lưu thông minh, tích hợp camera quan sát quá trình chín và điều khiển nhiệt độ tự động qua ứng dụng.',
    price: 8900000,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCXEeH83JyP_mcG23PasmagZxj2nPL-sJroeLfFUHQoe4cyZuYvuul_whjX9FZC3-eFLGVr1Gh8jyblrgj8Yzy_x6bbQBhzZ7gDSqtCrX86AhD7XJ1Z72GsmblHaYTHi-GodHMP3Kl0X-DUduzOdzlf770zWWsHPp2zyOZOKNWhLDmpm3BB75N4qUJ3fbgpV84jPsrrPFEHTJBFSef_Mi7cQ8Ot8ixhSo9kyQ7jZRpfxWpqNAzORKXQ9EXKLkkAtJrpyadR7KRGvEpV',
    category: 'Home & Kitchen',
    rating: 4.8,
    stock: 12
  },
  {
    id: 'mock-p-6',
    name: 'Máy Lọc Không Khí Volitify Air',
    description: 'Màng lọc HEPA H13 loại bỏ 99.97% bụi mịn và vi khuẩn, cảm biến đo chất lượng không khí thời gian thực siêu nhạy.',
    price: 5600000,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC-w28NnAFIInT0qFs4n_V8zgeaUNCHCvBPOSmhOHuWEj3maUBIS86W3u2DDIFlWY-OHefYL187WXQYT-EULQuHQZ3lU8CED5aPQ_8pY5mdg9MFULmp66LCnLizB-V-n_TT21wphm0QEpmgQXoVsTHMoJkIlvmaoUcQEbfBFSKPAyY76631aG5rfvVDZZHox--CUDRnDrxreXl_tn37ntExPfm68FN-pZgxsKLfrarGaiImFelJ4MqKq5zheNgNsStKPvLFyqrtfIiM',
    category: 'Accessories',
    rating: 4.5,
    stock: 8
  }
];

export const productService = {
  getAll: async (params: ProductFilterParams = {}): Promise<Product[]> => {
    try {
      const response: any = await API.get('/products', { params });
      const data = response.data || response;
      return data.products || [];
    } catch (error) {
      console.warn('[Offline Fallback] Fetching products failed, using mock data.');
      
      const { category, search } = params;
      let filtered = [...fallbackProducts];
      
      if (category) {
        filtered = filtered.filter(p => matchesCategory(p, category));
      }
      
      if (search) {
        const query = search.toLowerCase();
        filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(query) || 
          p.description.toLowerCase().includes(query)
        );
      }
      
      return filtered;
    }
  },

  getById: async (productId: string): Promise<Product> => {
    try {
      const response: any = await API.get(`/products/${productId}`);
      const data = response.data || response;
      return data.product;
    } catch (error) {
      console.warn('[Offline Fallback] Fetching product details failed, using mock fallback.');
      const found = fallbackProducts.find(p => p.id === productId);
      if (found) return found;
      throw error;
    }
  },

  getBrands: async (): Promise<BrandOption[]> => {
    try {
      const response: any = await API.get('/products/meta/brands');
      const data = response.data || response;
      return data.brands || [];
    } catch {
      return [];
    }
  },

  getCategories: async (): Promise<CategoryOption[]> => {
    try {
      const response: any = await API.get('/products/meta/categories');
      const data = response.data || response;
      return data.categories || [];
    } catch {
      return [];
    }
  },

  getRelated: async (currentId: string, category: string): Promise<Product[]> => {
    try {
      const response: any = await API.get('/products', { params: { category } });
      const data = response.data || response;
      const all: Product[] = data.products || [];
      return all.filter(p => p.id !== currentId).slice(0, 4);
    } catch {
      return fallbackProducts
        .filter(p => p.category === category && p.id !== currentId)
        .slice(0, 4);
    }
  }
};

