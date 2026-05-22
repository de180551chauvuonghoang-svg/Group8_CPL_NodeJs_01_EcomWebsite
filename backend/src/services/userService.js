import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// In-memory user database
const users = [];

// Helper to hash password
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

// Seed initial users on startup
const seedUsers = async () => {
  const adminPassword = await hashPassword('password123');
  const customerPassword = await hashPassword('password123');

  users.push(
    {
      id: 'usr_admin123',
      name: 'Admin Manager',
      email: 'admin@ecom.com',
      password: adminPassword,
      role: 'admin',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_cust123',
      name: 'Nguyen Van A',
      email: 'customer@ecom.com',
      password: customerPassword,
      role: 'customer',
      createdAt: new Date().toISOString()
    }
  );
  console.log('[Seed] In-memory users pre-populated: admin@ecom.com & customer@ecom.com (password: password123)');
};

// Seed immediately
seedUsers();

export const userService = {
  // Register user
  register: async ({ name, email, password }) => {
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      throw new Error('Email is already registered');
    }

    const hashedPassword = await hashPassword(password);
    const newUser = {
      id: `usr_${Math.random().toString(36).substr(2, 9)}`,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'customer', // default role
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    
    // Return without password
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },

  // Login user
  login: async ({ email, password }) => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'supersecretkeyforecommerce2026_dev_env',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  },

  // Get user profile
  getProfile: async (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  // Check if user exists
  findById: async (userId) => {
    return users.find(u => u.id === userId);
  }
};
