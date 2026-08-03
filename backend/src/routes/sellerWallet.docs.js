/**
 * @openapi
 * tags:
 *   - name: Seller Wallet
 *   - name: Admin Withdrawals
 *
 * /api/seller/wallet:
 *   get:
 *     summary: Get seller wallet balances and masked bank information
 *     tags: [Seller Wallet]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Wallet balances, minimum withdrawal amount, and hold days }
 *       403: { description: Active seller role is required }
 *
 * /api/seller/wallet/transactions:
 *   get:
 *     summary: Get immutable seller wallet ledger
 *     tags: [Seller Wallet]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, sale_pending, sale_released, sale_reversed, withdrawal_hold, withdrawal_approved, withdrawal_rejected, withdrawal_cancelled]
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: Paginated wallet transactions }
 *
 * /api/seller/withdrawals:
 *   get:
 *     summary: List seller withdrawal requests
 *     tags: [Seller Wallet]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [all, pending, approved, rejected, cancelled] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: Paginated withdrawal requests }
 *   post:
 *     summary: Create a seller withdrawal request and hold the balance
 *     tags: [Seller Wallet]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: integer, example: 500000 }
 *               sellerNote: { type: string, maxLength: 500 }
 *     responses:
 *       201: { description: Withdrawal request created }
 *       400: { description: Invalid amount or missing bank information }
 *       409: { description: Insufficient available balance }
 *
 * /api/seller/withdrawals/{id}/cancel:
 *   patch:
 *     summary: Cancel a pending seller withdrawal request
 *     tags: [Seller Wallet]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Held balance restored to available balance }
 *       404: { description: WITHDRAWAL_NOT_FOUND }
 *       409: { description: WITHDRAWAL_NOT_CANCELLABLE }
 *
 * /api/admin/withdrawals:
 *   get:
 *     summary: List withdrawal requests for admin processing
 *     tags: [Admin Withdrawals]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [all, pending, approved, rejected, cancelled] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: Requests include the bank snapshot for manual transfer }
 *       403: { description: Admin role is required }
 *
 * /api/admin/withdrawals/{id}:
 *   patch:
 *     summary: Approve or reject a pending withdrawal request
 *     tags: [Admin Withdrawals]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [approved, rejected] }
 *               adminNote: { type: string, maxLength: 500 }
 *     responses:
 *       200: { description: Wallet hold is settled or restored atomically }
 *       404: { description: WITHDRAWAL_NOT_FOUND }
 *       409: { description: Request was already processed }
 */

export {};
