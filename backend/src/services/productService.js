// In-memory products store
let products = [
  {
    id: 'prod_1',
    name: 'Wireless Noise-Canceling Headphones',
    price: 199.99,
    description: 'Experience premium sound quality with active noise cancellation, 40-hour battery life, and comfortable memory foam ear cups.',
    category: 'Audio',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
    stock: 15,
    rating: 4.8,
    reviewsCount: 124
  },
  {
    id: 'prod_2',
    name: 'Mechanical Gaming Keyboard',
    price: 89.99,
    description: 'Tactile mechanical blue switches, customizable RGB backlighting, durable aluminum chassis, and dedicated media keys.',
    category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=600&q=80',
    stock: 25,
    rating: 4.6,
    reviewsCount: 89
  },
  {
    id: 'prod_3',
    name: 'Ergonomic Wireless Mouse',
    price: 49.99,
    description: 'Precision wireless mouse with adjustable DPI settings, side-scrolling wheel, and ergonomic shape designed for all-day comfort.',
    category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80',
    stock: 40,
    rating: 4.5,
    reviewsCount: 215
  },
  {
    id: 'prod_4',
    name: 'Smart fitness Watch Pro',
    price: 149.99,
    description: 'Track your daily fitness activity, heart rate, sleep quality, and receive calls/notifications on a sleek AMOLED display.',
    category: 'Wearables',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
    stock: 12,
    rating: 4.7,
    reviewsCount: 64
  },
  {
    id: 'prod_5',
    name: 'Cold-Brew Coffee Maker',
    price: 34.99,
    description: 'Brew delicious and rich iced coffee at home. Airtight silicone lid keeps coffee fresh for up to 2 weeks, premium glass carafe.',
    category: 'Home & Kitchen',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    stock: 8,
    rating: 4.4,
    reviewsCount: 156
  },
  {
    id: 'prod_6',
    name: 'Ultra-Wide Curved Monitor 34"',
    price: 449.99,
    description: 'Immersive gaming and productivity experience with 144Hz refresh rate, HDR 10 support, 21:9 ratio, and rich dual speakers.',
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80',
    stock: 5,
    rating: 4.9,
    reviewsCount: 42
  }
];

export const productService = {
  // Get all products with optional category filter and search
  getAll: async ({ category, search }) => {
    let filteredProducts = [...products];

    if (category) {
      filteredProducts = filteredProducts.filter(
        p => p.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredProducts = filteredProducts.filter(
        p => p.name.toLowerCase().includes(searchLower) || 
             p.description.toLowerCase().includes(searchLower)
      );
    }

    return filteredProducts;
  },

  // Get product by ID
  getById: async (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  },

  // Create new product (Admin feature)
  create: async (productData) => {
    const newProduct = {
      id: `prod_${Math.random().toString(36).substr(2, 9)}`,
      name: productData.name,
      price: parseFloat(productData.price) || 0.0,
      description: productData.description || '',
      category: productData.category || 'Uncategorized',
      image: productData.image || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80',
      stock: parseInt(productData.stock) || 0,
      rating: 5.0,
      reviewsCount: 0
    };

    products.push(newProduct);
    return newProduct;
  },

  // Update existing product (Admin feature)
  update: async (productId, updateData) => {
    const index = products.findIndex(p => p.id === productId);
    if (index === -1) {
      throw new Error('Product not found');
    }

    const updatedProduct = {
      ...products[index],
      ...updateData,
      // Ensure correct types
      price: updateData.price !== undefined ? parseFloat(updateData.price) : products[index].price,
      stock: updateData.stock !== undefined ? parseInt(updateData.stock) : products[index].stock
    };

    products[index] = updatedProduct;
    return updatedProduct;
  },

  // Delete product (Admin feature)
  delete: async (productId) => {
    const index = products.findIndex(p => p.id === productId);
    if (index === -1) {
      throw new Error('Product not found');
    }

    const deletedProduct = products[index];
    products = products.filter(p => p.id !== productId);
    return deletedProduct;
  },

  // Update stock when an order is placed
  reduceStock: async (productId, quantity) => {
    const product = products.find(p => p.id === productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    if (product.stock < quantity) {
      throw new Error(`Insufficient stock for product: ${product.name}`);
    }

    product.stock -= quantity;
    return product;
  }
};
