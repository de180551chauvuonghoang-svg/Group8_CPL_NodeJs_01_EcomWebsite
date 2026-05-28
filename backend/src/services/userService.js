import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sql, pool } from "../config/db.js";

// Helper to hash password
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

export const userService = {
  // Register user
  register: async ({ name, email, password }) => {
    // 1. Check if email already exists in Database
    const emailCheckResult = await pool
      .request()
      .input("email", sql.VarChar, email.toLowerCase())
      .query("SELECT * FROM Users WHERE email = @email");

    if (emailCheckResult.recordset.length > 0) {
      throw new Error("Email is already registered");
    }

    // 2. Hash password & Insert into SQL Server
    const hashedPassword = await hashPassword(password);
    const userId = `usr_${Math.random().toString(36).substr(2, 9)}`;
    const role = "customer"; // Default role

    await pool
      .request()
      .input("id", sql.VarChar, userId)
      .input("name", sql.NVarChar, name)
      .input("email", sql.VarChar, email.toLowerCase())
      .input("password", sql.VarChar, hashedPassword)
      .input("role", sql.VarChar, role).query(`
        INSERT INTO Users (id, name, email, password, role)
        VALUES (@id, @name, @email, @password, @role)
      `);

    return {
      id: userId,
      name,
      email: email.toLowerCase(),
      role,
    };
  },

  // Login user
  login: async ({ email, password }) => {
    // 1. Fetch user from SQL Server
    const result = await pool
      .request()
      .input("email", sql.VarChar, email.toLowerCase())
      .query("SELECT * FROM Users WHERE email = @email");

    const user = result.recordset[0];
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // 2. Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Invalid email or password");
    }

    // 3. Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "supersecretkeyforecommerce2026_dev_env",
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    };
  },

  // Get user profile
  getProfile: async (userId) => {
    const result = await pool
      .request()
      .input("id", sql.VarChar, userId)
      .query(
        "SELECT id, name, email, role, phone_number, created_at AS createdAt FROM Users WHERE id = @id",
      );

    const user = result.recordset[0];
    if (!user) {
      throw new Error("User not found");
    }

    return user;
  },

  // Find user by ID (used in middlewares)
  findById: async (userId) => {
    const result = await pool
      .request()
      .input("id", sql.VarChar, userId)
      .query(
        "SELECT id, name, email, role, phone_number, avatar_url, is_active, created_at FROM Users WHERE id = @id",
      );

    return result.recordset[0];
  },

  // Find user by Name
  findByName: async (name) => {
    const result = await pool
      .request()
      .input("name", sql.NVarChar, name)
      .query("SELECT * FROM Users WHERE name = @name");

    if (result.recordset[0]) {
      // Map password field to hashedPassword for consistency
      const user = result.recordset[0];
      user.hashedPassword = user.password;
      return user;
    }
    return null;
  },

  // Find user by Email
  findByEmail: async (email) => {
    const result = await pool
      .request()
      .input("email", sql.VarChar, email.toLowerCase())
      .query("SELECT * FROM Users WHERE email = @email");

    return result.recordset[0];
  },

  // Create new user (used in controllers)
  create: async ({ name, email, password, phonenumber }) => {
    const userId = `usr_${Math.random().toString(36).substr(2, 9)}`;
    const role = "customer"; // Default role

    await pool
      .request()
      .input("id", sql.VarChar, userId)
      .input("name", sql.NVarChar, name)
      .input("email", sql.VarChar, email.toLowerCase())
      .input("password", sql.VarChar, password)
      .input("phone_number", sql.VarChar, phonenumber)
      .input("role", sql.VarChar, role).query(`
        INSERT INTO Users (id, name, email, password, phone_number, role)
        VALUES (@id, @name, @email, @password, @phone_number, @role)
      `);

    return {
      id: userId,
      name,
      email: email.toLowerCase(),
      role,
    };
  },
};
