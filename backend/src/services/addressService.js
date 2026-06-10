import { sql, pool } from "../config/db.js";

export const addressService = {
  // Get all addresses for a user
  getUserAddresses: async (userId) => {
    const result = await pool
      .request()
      .input("user_id", sql.VarChar, userId)
      .query(`
        SELECT * FROM UserAddresses 
        WHERE user_id = @user_id 
        ORDER BY is_default DESC, created_at DESC
      `);
    return result.recordset;
  },

  // Get a single address by ID
  getAddressById: async (id, userId) => {
    const result = await pool
      .request()
      .input("id", sql.VarChar, id)
      .input("user_id", sql.VarChar, userId)
      .query("SELECT * FROM UserAddresses WHERE id = @id AND user_id = @user_id");
    return result.recordset[0];
  },

  // Create new address
  createAddress: async (userId, { recipient_name, phone_number, street_address, city, is_default }) => {
    // If it's default, we must unset other defaults first
    if (is_default) {
      await pool.request()
        .input("user_id", sql.VarChar, userId)
        .query("UPDATE UserAddresses SET is_default = 0 WHERE user_id = @user_id");
    } else {
      // If user has no addresses, make this the default
      const existing = await pool.request()
        .input("user_id", sql.VarChar, userId)
        .query("SELECT TOP 1 id FROM UserAddresses WHERE user_id = @user_id");
      if (existing.recordset.length === 0) {
        is_default = true;
      }
    }

    const id = `addr_${Math.random().toString(36).substr(2, 9)}`;

    await pool.request()
      .input("id", sql.VarChar, id)
      .input("user_id", sql.VarChar, userId)
      .input("recipient_name", sql.NVarChar, recipient_name)
      .input("phone_number", sql.VarChar, phone_number)
      .input("street_address", sql.NVarChar, street_address)
      .input("city", sql.NVarChar, city)
      .input("is_default", sql.Bit, is_default ? 1 : 0)
      .query(`
        INSERT INTO UserAddresses (id, user_id, recipient_name, phone_number, street_address, city, is_default)
        VALUES (@id, @user_id, @recipient_name, @phone_number, @street_address, @city, @is_default)
      `);

    return await addressService.getAddressById(id, userId);
  },

  // Update an address
  updateAddress: async (id, userId, { recipient_name, phone_number, street_address, city, is_default }) => {
    if (is_default) {
      await pool.request()
        .input("user_id", sql.VarChar, userId)
        .query("UPDATE UserAddresses SET is_default = 0 WHERE user_id = @user_id");
    }

    await pool.request()
      .input("id", sql.VarChar, id)
      .input("user_id", sql.VarChar, userId)
      .input("recipient_name", sql.NVarChar, recipient_name)
      .input("phone_number", sql.VarChar, phone_number)
      .input("street_address", sql.NVarChar, street_address)
      .input("city", sql.NVarChar, city)
      .input("is_default", sql.Bit, is_default ? 1 : 0)
      .query(`
        UPDATE UserAddresses 
        SET recipient_name = @recipient_name,
            phone_number = @phone_number,
            street_address = @street_address,
            city = @city,
            is_default = @is_default
        WHERE id = @id AND user_id = @user_id
      `);

    return await addressService.getAddressById(id, userId);
  },

  // Delete an address
  deleteAddress: async (id, userId) => {
    // Check if it's default before deleting
    const target = await addressService.getAddressById(id, userId);
    if (!target) return false;

    await pool.request()
      .input("id", sql.VarChar, id)
      .input("user_id", sql.VarChar, userId)
      .query("DELETE FROM UserAddresses WHERE id = @id AND user_id = @user_id");

    // If we deleted the default, set another one as default
    if (target.is_default) {
      await pool.request()
        .input("user_id", sql.VarChar, userId)
        .query(`
          UPDATE UserAddresses 
          SET is_default = 1 
          WHERE id = (
            SELECT TOP 1 id FROM UserAddresses 
            WHERE user_id = @user_id 
            ORDER BY created_at DESC
          )
        `);
    }

    return true;
  },

  // Set as default
  setDefault: async (id, userId) => {
    // Unset all
    await pool.request()
      .input("user_id", sql.VarChar, userId)
      .query("UPDATE UserAddresses SET is_default = 0 WHERE user_id = @user_id");

    // Set new default
    await pool.request()
      .input("id", sql.VarChar, id)
      .input("user_id", sql.VarChar, userId)
      .query("UPDATE UserAddresses SET is_default = 1 WHERE id = @id AND user_id = @user_id");

    return true;
  }
};
