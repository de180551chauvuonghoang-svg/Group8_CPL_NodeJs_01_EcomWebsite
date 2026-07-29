export const FULFILLMENT_STATUS = Object.freeze({
  PENDING: "pending_fulfillment",
  READY_TO_SHIP: "ready_to_ship",
  SHIPPING: "shipping",
  DELIVERED: "delivered",
  CANCELLED: "cancelled"
});

const allowedTransitions = Object.freeze({
  [FULFILLMENT_STATUS.PENDING]: new Set([
    FULFILLMENT_STATUS.READY_TO_SHIP,
    FULFILLMENT_STATUS.CANCELLED
  ]),
  [FULFILLMENT_STATUS.READY_TO_SHIP]: new Set([
    FULFILLMENT_STATUS.SHIPPING,
    FULFILLMENT_STATUS.CANCELLED
  ]),
  [FULFILLMENT_STATUS.SHIPPING]: new Set([
    FULFILLMENT_STATUS.DELIVERED
  ]),
  [FULFILLMENT_STATUS.DELIVERED]: new Set(),
  [FULFILLMENT_STATUS.CANCELLED]: new Set()
});

export const orderStatusError = (code, message, statusCode = 400) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.status = "fail";
  return error;
};

export const normalizeFulfillmentStatus = (status) => (
  status === "shipped" ? FULFILLMENT_STATUS.SHIPPING : status
);

export const assertFulfillmentTransition = (currentStatus, requestedStatus) => {
  const current = normalizeFulfillmentStatus(currentStatus);
  const next = normalizeFulfillmentStatus(requestedStatus);

  if (!Object.values(FULFILLMENT_STATUS).includes(next)) {
    throw orderStatusError(
      "INVALID_FULFILLMENT_STATUS",
      "Trạng thái đơn hàng không hợp lệ."
    );
  }

  if (!Object.values(FULFILLMENT_STATUS).includes(current)) {
    throw orderStatusError(
      "INVALID_CURRENT_FULFILLMENT_STATUS",
      "Trạng thái hiện tại của đơn hàng không hợp lệ.",
      409
    );
  }

  if (current !== next && !allowedTransitions[current].has(next)) {
    throw orderStatusError(
      "INVALID_FULFILLMENT_TRANSITION",
      `Không thể chuyển trạng thái từ ${current} sang ${next}.`,
      409
    );
  }

  return { current, next, changed: current !== next };
};

const normalizeOrderFallback = (status) => {
  const normalized = normalizeFulfillmentStatus(status);
  if (["pending", "confirmed", "pending_payment", "processing"].includes(normalized)) {
    return FULFILLMENT_STATUS.PENDING;
  }
  if (["failed", "refunded"].includes(normalized)) {
    return FULFILLMENT_STATUS.CANCELLED;
  }
  return Object.values(FULFILLMENT_STATUS).includes(normalized)
    ? normalized
    : FULFILLMENT_STATUS.PENDING;
};

export const deriveOrderDisplayStatus = (items, fallbackStatus) => {
  if (!Array.isArray(items) || items.length === 0) {
    return normalizeOrderFallback(fallbackStatus);
  }

  const statuses = items.map((item) => normalizeFulfillmentStatus(
    typeof item === "string" ? item : item.fulfillment_status
  ));
  const activeStatuses = statuses.filter((status) => status !== FULFILLMENT_STATUS.CANCELLED);

  if (activeStatuses.length === 0) return FULFILLMENT_STATUS.CANCELLED;
  if (activeStatuses.every((status) => status === FULFILLMENT_STATUS.DELIVERED)) {
    return FULFILLMENT_STATUS.DELIVERED;
  }
  if (activeStatuses.includes(FULFILLMENT_STATUS.SHIPPING)) {
    return FULFILLMENT_STATUS.SHIPPING;
  }
  if (activeStatuses.includes(FULFILLMENT_STATUS.READY_TO_SHIP)) {
    return FULFILLMENT_STATUS.READY_TO_SHIP;
  }
  if (activeStatuses.includes(FULFILLMENT_STATUS.PENDING)) {
    return FULFILLMENT_STATUS.PENDING;
  }

  return normalizeOrderFallback(fallbackStatus);
};
