export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  phone_number?: string;
  avatar_url?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  rating: number;
  stock: number;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (idToken: string) => Promise<User>;
  register: (name: string, email: string, password: string, phone: string) => Promise<any>;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
}
