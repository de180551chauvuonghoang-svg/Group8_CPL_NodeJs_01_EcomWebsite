/**
 * @openapi
 * components:
 *   schemas:
 *     Pagination:
 *       type: object
 *       properties:
 *         page: { type: integer, example: 1 }
 *         limit: { type: integer, example: 20 }
 *         total: { type: integer, example: 42 }
 *         total_pages: { type: integer, example: 3 }
 *     ShopCouponInput:
 *       type: object
 *       required: [sellerId, code]
 *       properties:
 *         sellerId: { type: string, example: sel_001 }
 *         code: { type: string, example: SHOP10 }
 *     ProductImageInput:
 *       type: object
 *       required: [url]
 *       properties:
 *         url: { type: string, format: uri }
 *         publicId: { type: string, nullable: true }
 *         isPrimary: { type: boolean, default: false }
 */

/**
 * @openapi
 * /api/seller/dashboard-tasks:
 *   get:
 *     summary: Get seller action counters
 *     tags: [Seller Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Orders, messages, inventory, reviews and returns requiring attention
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     ordersToProcess: { type: integer, example: 3 }
 *                     overdueOrders: { type: integer, example: 1 }
 *                     unreadMessages: { type: integer, example: 2 }
 *                     outOfStockProducts: { type: integer, example: 1 }
 *                     lowStockProducts: { type: integer, example: 4 }
 *                     unrepliedReviews: { type: integer, example: 6 }
 *                     pendingReturns: { type: integer, example: 2 }
 *                     overdueAfterHours: { type: integer, example: 24 }
 */

/**
 * @openapi
 * /api/seller/uploads/images:
 *   post:
 *     summary: Upload one seller image to Cloudinary
 *     tags: [Seller Uploads]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, purpose]
 *             properties:
 *               file: { type: string, format: binary }
 *               purpose:
 *                 type: string
 *                 enum: [product, shop_logo, shop_cover]
 *     responses:
 *       201: { description: Returns url and publicId }
 *       400: { description: Invalid type, purpose or file larger than 5 MB }
 *   delete:
 *     summary: Delete an image owned by the current seller
 *     tags: [Seller Uploads]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [publicId]
 *             properties:
 *               publicId: { type: string }
 *     responses:
 *       200: { description: Image deleted or already absent }
 *       403: { description: Image is not owned by this seller account }
 *
 * /api/uploads/images:
 *   post:
 *     summary: Compatibility alias for seller image upload
 *     deprecated: true
 *     tags: [Seller Uploads]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Use POST /api/seller/uploads/images for new integrations }
 */

/**
 * @openapi
 * /api/seller/products:
 *   get:
 *     summary: List seller products using one logical default variant
 *     tags: [Seller Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { in: query, name: search, schema: { type: string, maxLength: 100 } }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [all, active, inactive, low_stock, out_of_stock] }
 *       - { in: query, name: categoryId, schema: { type: string } }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [created_at, name, price, stock] }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200: { description: Products and pagination }
 *   post:
 *     summary: Create a product and its only default variant
 *     tags: [Seller Products]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price, categoryId]
 *             properties:
 *               name: { type: string }
 *               price: { type: number, exclusiveMinimum: 0 }
 *               categoryId: { type: string }
 *               description: { type: string, nullable: true }
 *               sku: { type: string }
 *               stock: { type: integer, minimum: 0, default: 0 }
 *               lowStockThreshold: { type: integer, minimum: 0, default: 5 }
 *               isActive: { type: boolean, default: true }
 *               images:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 8
 *                 items: { $ref: '#/components/schemas/ProductImageInput' }
 *     responses:
 *       201: { description: Product created }
 */

/**
 * @openapi
 * /api/seller/orders:
 *   get:
 *     summary: List seller orders with filters and pagination
 *     tags: [Seller Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [all, pending_fulfillment, ready_to_ship, shipping, delivered, cancelled] }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [created_at, total, status] } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200: { description: Orders and pagination }
 */

/**
 * @openapi
 * /api/payments/coupons/validate:
 *   post:
 *     summary: Validate one voucher against items from its shop
 *     tags: [Checkout]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, sellerId, cartItems]
 *             properties:
 *               code: { type: string, example: SHOP10 }
 *               sellerId: { type: string, example: sel_001 }
 *               cartItems: { type: array, items: { type: object } }
 *     responses:
 *       200: { description: Eligible subtotal, discount and trusted cart subtotal }
 *       400: { description: Coupon is invalid or minimum order is not met }
 *       409: { description: Price or stock changed }
 */

/**
 * @openapi
 * /api/payments/cod/create:
 *   post:
 *     summary: Create a COD order with at most one voucher per shop
 *     tags: [Checkout]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cartItems, shippingInfo]
 *             properties:
 *               cartItems: { type: array, items: { type: object } }
 *               shippingInfo: { type: object }
 *               couponCodes:
 *                 type: array
 *                 items: { $ref: '#/components/schemas/ShopCouponInput' }
 *               total: { type: number, description: Optional client check; BE always recalculates }
 *     responses:
 *       201: { description: Trusted pricing includes couponDiscounts per seller }
 *       403: { description: Seller tried to buy from their own shop }
 *       409: { description: Price or stock changed }
 */

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     summary: List current user notifications
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { in: query, name: type, schema: { type: string } }
 *       - { in: query, name: isRead, schema: { type: boolean } }
 *     responses:
 *       200: { description: Notifications, total unread count and pagination }
 * /api/notifications/read-all:
 *   post:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Number of updated notifications }
 *   patch:
 *     summary: Compatibility method to mark all notifications as read
 *     deprecated: true
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Number of updated notifications }
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark one owned notification as read
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated notification }
 *       404: { description: Notification not found for current user }
 */

/**
 * @openapi
 * /api/shops/{shopId}/follow:
 *   post:
 *     summary: Follow a shop
 *     tags: [Shop Follow]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: shopId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Follow status and follower count }
 *       409: { description: Seller cannot follow their own shop }
 *   delete:
 *     summary: Unfollow a shop
 *     tags: [Shop Follow]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: shopId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Follow status and follower count }
 * /api/shops/{shopId}/follow-status:
 *   get:
 *     summary: Get current user's follow status for a shop
 *     tags: [Shop Follow]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: shopId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Follow status and follower count }
 */

/**
 * @openapi
 * /api/orders/items/{itemId}/returns:
 *   post:
 *     summary: Customer requests a return within seven days after delivery
 *     tags: [Returns]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: itemId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity, reason]
 *             properties:
 *               quantity: { type: integer, minimum: 1 }
 *               reason: { type: string, minLength: 10, maxLength: 1000 }
 *     responses:
 *       201: { description: Return request created }
 *       409: { description: Item is not delivered, window expired or quantity exceeded }
 * /api/me/returns:
 *   get:
 *     summary: List current customer's return requests
 *     tags: [Returns]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Returns and pagination }
 */

/**
 * @openapi
 * /api/seller/returns:
 *   get:
 *     summary: List return requests belonging to current seller
 *     tags: [Seller Returns]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [all, requested, approved, rejected, received, refunded] } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [requested_at, status, product_name, customer_name] } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200: { description: Seller returns and pagination }
 * /api/seller/returns/{returnId}:
 *   get:
 *     summary: Get seller-owned return detail and history
 *     tags: [Seller Returns]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: returnId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Return and status history }
 *   patch:
 *     summary: Approve, reject or confirm receipt of a returned item
 *     tags: [Seller Returns]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: returnId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [approved, rejected, received] }
 *               sellerResponse: { type: string, maxLength: 1000 }
 *     responses:
 *       200: { description: Return status updated; received restores stock }
 *       409: { description: Invalid transition; refunded requires a real payment refund }
 */

/**
 * @openapi
 * /api/seller/finance/summary:
 *   get:
 *     summary: Get read-only delivered revenue summary
 *     tags: [Seller Finance]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *     responses:
 *       200: { description: Gross sales, voucher discounts, returns and estimated net revenue }
 *       400: { description: Invalid range or FINANCE_FUTURE_DATE_NOT_ALLOWED }
 * /api/seller/finance/transactions:
 *   get:
 *     summary: List read-only sale and return transactions by order item
 *     tags: [Seller Finance]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { in: query, name: status, schema: { type: string, enum: [all, sale, return] } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses:
 *       200: { description: Finance transactions and pagination }
 *       400: { description: Invalid range or FINANCE_FUTURE_DATE_NOT_ALLOWED }
 */

export {};
