import crypto from 'crypto';
import axios from 'axios';

// ─── MoMo Configuration (loaded from environment) ─────────────────────────────
const PARTNER_CODE  = process.env.MOMO_PARTNER_CODE;
const ACCESS_KEY    = process.env.MOMO_ACCESS_KEY;
const SECRET_KEY    = process.env.MOMO_SECRET_KEY;
const ENDPOINT      = process.env.MOMO_ENDPOINT;
const REDIRECT_URL  = process.env.MOMO_REDIRECT_URL;
const IPN_URL       = process.env.MOMO_IPN_URL;

/**
 * Build HMAC-SHA256 signature string required by MoMo API v2.
 * Docs: https://developers.momo.vn/#/docs/en/aiov2/?id=payment-method
 */
const buildSignature = (rawSignature) =>
  crypto.createHmac('sha256', SECRET_KEY).update(rawSignature).digest('hex');

/**
 * Create a MoMo payment request.
 * @param {string} orderId  - Unique order ID from our database
 * @param {number} amount   - Total amount in VND (integer, no decimals)
 * @param {string} orderInfo - Human-readable order description
 * @returns {{ payUrl: string, requestId: string }} MoMo payment URL + request ID
 */
export const createMoMoPaymentRequest = async (orderId, amount, orderInfo) => {
  const requestId    = `${PARTNER_CODE}${Date.now()}`;
  const requestType  = 'captureWallet';
  const extraData    = ''; // Base64 extra data (empty = none)
  
  console.log("[DEBUG MOMO] Keys loaded:", {
    PARTNER_CODE,
    ACCESS_KEY,
    SECRET_KEY_LENGTH: SECRET_KEY ? SECRET_KEY.length : 0,
    SECRET_KEY_VAL: SECRET_KEY, // Show the secret key to see if there are quotes or trailing spaces
    ENDPOINT,
    REDIRECT_URL,
    IPN_URL
  });
  const autoCapture  = true;
  const lang         = 'vi';

  // Raw signature components — order matters, must match MoMo docs exactly
  const rawSignature =
    `accessKey=${ACCESS_KEY}` +
    `&amount=${amount}` +
    `&extraData=${extraData}` +
    `&ipnUrl=${IPN_URL}` +
    `&orderId=${orderId}` +
    `&orderInfo=${orderInfo}` +
    `&partnerCode=${PARTNER_CODE}` +
    `&redirectUrl=${REDIRECT_URL}` +
    `&requestId=${requestId}` +
    `&requestType=${requestType}`;

  const signature = buildSignature(rawSignature);

  const requestBody = {
    partnerCode: PARTNER_CODE,
    accessKey:   ACCESS_KEY,
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl: REDIRECT_URL,
    ipnUrl:      IPN_URL,
    extraData,
    requestType,
    signature,
    lang,
    autoCapture,
  };

  try {
    const { data } = await axios.post(ENDPOINT, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10_000,
    });

    if (data.resultCode !== 0) {
      throw new Error(`MoMo API error [${data.resultCode}]: ${data.message}`);
    }

    return { payUrl: data.payUrl, requestId };
  } catch (err) {
    if (err.response && err.response.data) {
      const momoErr = err.response.data;
      console.error("[🚨 MoMo API Error Details]", momoErr);
      throw new Error(`MoMo API error [${momoErr.resultCode}]: ${momoErr.message || JSON.stringify(momoErr)}`);
    }
    throw err;
  }
};

/**
 * Verify the HMAC-SHA256 signature sent by MoMo in IPN webhook.
 * This prevents spoofed IPN calls.
 * @param {object} body  - Raw request body from MoMo IPN POST
 * @returns {boolean}
 */
export const verifyMoMoIpnSignature = (body) => {
  const {
    accessKey, amount, extraData, ipnUrl, orderId,
    orderInfo, partnerCode, redirectUrl, requestId,
    requestType, resultCode, transId, message,
  } = body;

  const rawSignature =
    `accessKey=${accessKey || ACCESS_KEY}` +
    `&amount=${amount}` +
    `&extraData=${extraData}` +
    `&ipnUrl=${ipnUrl || IPN_URL}` +
    `&message=${message}` +
    `&orderId=${orderId}` +
    `&orderInfo=${orderInfo}` +
    `&orderType=${body.orderType || ''}` +
    `&partnerCode=${partnerCode}` +
    `&payType=${body.payType || ''}` +
    `&redirectUrl=${redirectUrl || REDIRECT_URL}` +
    `&requestId=${requestId}` +
    `&requestType=${requestType || ''}` +
    `&responseTime=${body.responseTime || ''}` +
    `&resultCode=${resultCode}` +
    `&transId=${transId}`;

  const expected = buildSignature(rawSignature);
  return expected === body.signature;
};
