import { sql, pool } from '../config/db.js';

/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in kilometers (rounded to 2 decimal places).
 *
 * @param {number} lat1 - Latitude of point A
 * @param {number} lon1 - Longitude of point A
 * @param {number} lat2 - Latitude of point B
 * @param {number} lon2 - Longitude of point B
 * @returns {number} Distance in km
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

/**
 * Simulate customer coordinates based on a base location (dev environment).
 * Generates random coords within ~25 km of the base point (TP.HCM default).
 */
export const simulateCustomerCoordinates = (baseLat = 10.8231, baseLng = 106.6297) => {
  const latOffset = (Math.random() - 0.5) * 0.45; // ~25 km in latitude
  const lngOffset = (Math.random() - 0.5) * 0.45; // ~25 km in longitude
  return {
    latitude:  Math.round((baseLat + latOffset) * 1000000) / 1000000,
    longitude: Math.round((baseLng + lngOffset) * 1000000) / 1000000
  };
};

/**
 * Calculate shipping fee for an order.
 *
 * @param {string} shopId       - The shop ID
 * @param {number} customerLat  - Customer latitude
 * @param {number} customerLng  - Customer longitude
 * @returns {Promise<{distance_km: number, shipping_fee: number, shop: object}>}
 */
export const calculateShippingFee = async (shopId, customerLat, customerLng) => {
  const result = await pool.request()
    .input('shopId', sql.VarChar, shopId)
    .query('SELECT * FROM Shops WHERE id = @shopId');

  const shop = result.recordset[0];
  if (!shop) {
    throw new Error(`Shop not found: ${shopId}`);
  }

  const distance_km = calculateDistance(
    parseFloat(shop.latitude),
    parseFloat(shop.longitude),
    customerLat,
    customerLng
  );

  const shipping_fee = Math.round(distance_km * parseFloat(shop.shipping_fee_per_km));

  return { distance_km, shipping_fee, shop };
};
