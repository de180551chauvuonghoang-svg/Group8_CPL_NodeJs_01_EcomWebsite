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
        "SELECT id, name, email, role, phone_number, avatar_url, bio, is_active, created_at FROM Users WHERE id = @id",
      );

    return result.recordset[0];
  },

  // Find user by Name or Email
  findByName: async (name) => {
    const inputLower = name ? name.toString().trim() : "";
    const result = await pool
      .request()
      .input("name", sql.NVarChar, inputLower)
      .input("email", sql.VarChar, inputLower.toLowerCase())
      .query("SELECT * FROM Users WHERE name = @name OR email = @email");

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

    // Tự động thêm vào sổ địa chỉ nếu có số điện thoại
    if (phonenumber) {
      const addressId = `addr_${Math.random().toString(36).substr(2, 9)}`;
      await pool.request()
        .input("id", sql.VarChar, addressId)
        .input("user_id", sql.VarChar, userId)
        .input("recipient_name", sql.NVarChar, name)
        .input("phone_number", sql.VarChar, phonenumber)
        .input("street_address", sql.NVarChar, "Chưa cập nhật")
        .input("city", sql.NVarChar, "Chưa cập nhật")
        .input("is_default", sql.Bit, 1)
        .query(`
          INSERT INTO UserAddresses (id, user_id, recipient_name, phone_number, street_address, city, is_default)
          VALUES (@id, @user_id, @recipient_name, @phone_number, @street_address, @city, @is_default)
        `);
    }

    return {
      id: userId,
      name,
      email: email.toLowerCase(),
      role,
    };
  },

  // Update user avatar
  updateAvatar: async (userId, avatarUrl) => {
    if (!userId || !avatarUrl) {
      throw new Error("User ID and Avatar URL are required for updateAvatar");
    }
    await pool.request()
      .input("id", sql.VarChar, userId)
      .input("avatar_url", sql.VarChar, avatarUrl)
      .query("UPDATE Users SET avatar_url = @avatar_url WHERE id = @id");
    return true;
  },

  // Update full profile information
  updateProfile: async (userId, { name, phone_number, avatar_url, bio }) => {
    if (!userId) {
      throw new Error("User ID is required for updateProfile");
    }

    const payload = { name, phone_number, avatar_url, bio };
    const hasAvatar = Object.prototype.hasOwnProperty.call(payload, 'avatar_url');

    const req = pool.request()
      .input("id", sql.VarChar, userId)
      .input("name", sql.NVarChar, name)
      .input("phone_number", sql.VarChar, phone_number || null)
      .input("bio", sql.NVarChar, bio || null);

    let queryStr = `
      UPDATE Users 
      SET name = @name, 
          phone_number = @phone_number, 
          bio = @bio,
          updated_at = GETDATE()
    `;

    if (hasAvatar) {
      req.input("avatar_url", sql.VarChar, avatar_url || null);
      queryStr += `, avatar_url = @avatar_url`;
    }

    queryStr += ` WHERE id = @id`;

    await req.query(queryStr);

    // Get the freshly updated user record including new fields
    const result = await pool.request()
      .input("id", sql.VarChar, userId)
      .query("SELECT id, name, email, role, phone_number, avatar_url, bio, is_active FROM Users WHERE id = @id");
    
    return result.recordset[0];
  },
};
