import { sellerService } from "../services/sellerService.js";
import { messageService } from "../services/messageService.js";
import { getSellerOrderTimeline as loadSellerOrderTimeline } from "../services/orderTimelineService.js";
import { sql, pool } from "../config/db.js";
import {
  normalizeSellerContact,
  validateProductNumbers,
  validateSellerContact
} from "../utils/sellerValidation.js";
import {
  INVENTORY_TYPES,
  recordInventoryLog,
  validateInventoryReason
} from "../services/inventoryService.js";

const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80";

const normalizeProductImages = (body, userId, { useDefault = false } = {}) => {
  let rawImages;
  if (body.images !== undefined) {
    if (!Array.isArray(body.images)) {
      const error = new Error("images phai la mot mang.");
      error.code = "INVALID_PRODUCT_IMAGES";
      throw error;
    }
    rawImages = body.images;
  } else if (body.image) {
    rawImages = [{ url: body.image, publicId: body.imagePublicId || null }];
  } else {
    rawImages = useDefault ? [{ url: DEFAULT_PRODUCT_IMAGE, publicId: null }] : null;
  }
  if (rawImages === null) return null;
  if (rawImages.length < 1 || rawImages.length > 8) {
    const error = new Error("San pham phai co tu 1 den 8 anh.");
    error.code = "INVALID_PRODUCT_IMAGE_COUNT";
    throw error;
  }
  const ownerPrefix = `volitify/${String(userId).replace(/[^a-zA-Z0-9_-]/g, "_")}/product/`;
  let primaryIndex = rawImages.findIndex((item) => Boolean(item?.isPrimary));
  if (primaryIndex < 0) primaryIndex = 0;
  return rawImages.map((item, index) => {
    const url = String(item?.url || "").trim();
    const publicId = item?.publicId ? String(item.publicId).trim() : null;
    if (!/^https?:\/\//i.test(url) || url.length > 2083) {
      const error = new Error("URL anh san pham khong hop le.");
      error.code = "INVALID_PRODUCT_IMAGE_URL";
      throw error;
    }
    if (publicId && (publicId.length > 255 || !publicId.startsWith(ownerPrefix))) {
      const error = new Error("Anh upload khong thuoc tai khoan seller hien tai.");
      error.code = "PRODUCT_IMAGE_NOT_OWNED";
      error.statusCode = 403;
      throw error;
    }
    return {
      url,
      publicId,
      isPrimary: index === primaryIndex,
      sortOrder: index
    };
  });
};

// Đăng ký làm Seller
export const registerSeller = async (req, res, next) => {
  try {
    const {
      shopName,
      shopPhone,
      shopAddress,
      description,
      logoUrl,
      logoPublicId,
      coverUrl,
      coverPublicId,
      pickupAddress,
      identityName,
      identityNumber,
      bankName,
      bankAccountNo,
      bankAccountHolder
    } = req.body;
    const userId = req.user.id;
    const normalizedShopName = typeof shopName === "string" ? shopName.trim() : "";
    const normalizedShopAddress = typeof shopAddress === "string" ? shopAddress.trim() : "";

    if (!normalizedShopName || !shopPhone || !normalizedShopAddress) {
      return res.status(400).json({
        status: "fail",
        message: "Vui lòng cung cấp đầy đủ tên, số điện thoại và địa chỉ cửa hàng!"
      });
    }

    const validationError = validateSellerContact({
      shopPhone,
      identityNumber,
      bankAccountNo
    });
    if (validationError) {
      return res.status(400).json({ status: "fail", message: validationError });
    }
    const normalizedContact = normalizeSellerContact({
      shopPhone,
      identityNumber,
      bankAccountNo
    });

    const result = await sellerService.registerSeller({
      userId,
      shopName: normalizedShopName,
      shopPhone: normalizedContact.shopPhone,
      shopAddress: normalizedShopAddress,
      description,
      logoUrl,
      logoPublicId,
      coverUrl,
      coverPublicId,
      pickupAddress,
      identityName,
      identityNumber: normalizedContact.identityNumber,
      bankName,
      bankAccountNo: normalizedContact.bankAccountNo,
      bankAccountHolder
    });

    res.status(200).json({
      status: "success",
      message: "Yêu cầu mở cửa hàng đã được gửi và đang chờ duyệt.",
      data: {
        application: {
          sellerId: result.sellerId,
          status: result.status
        }
      }
    });

  } catch (err) {
    res.status(err.statusCode || 400).json({
      status: "fail",
      ...(err.code && { code: err.code }),
      message: err.message
    });
  }
};

export const getSellerApplication = async (req, res, next) => {
  try {
    const application = await sellerService.getSellerApplicationByUserId(req.user.id);
    return res.status(200).json({
      status: "success",
      data: { application }
    });
  } catch (error) {
    return next(error);
  }
};

// Lấy thông tin shop của user hiện tại
export const getSellerProfile = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    if (!seller) {
      return res.status(404).json({
        status: "fail",
        message: "Bạn chưa đăng ký làm người bán hàng."
      });
    }

    res.status(200).json({
      status: "success",
      data: { seller }
    });
  } catch (err) {
    next(err);
  }
};

export const updateSellerProfile = async (req, res, next) => {
  try {
    const { shopName, shopPhone, shopAddress, identityNumber, bankAccountNo } = req.body;
    if (!shopName || !shopPhone || !shopAddress) {
      return res.status(400).json({
        status: "fail",
        message: "Tên shop, số điện thoại và địa chỉ shop là bắt buộc."
      });
    }

    const validationError = validateSellerContact({
      shopPhone,
      identityNumber,
      bankAccountNo
    });
    if (validationError) {
      return res.status(400).json({ status: "fail", message: validationError });
    }

    const normalizedContact = normalizeSellerContact({
      shopPhone,
      identityNumber,
      bankAccountNo
    });
    const seller = await sellerService.updateSellerProfile(req.user.id, {
      ...req.body,
      ...normalizedContact
    });
    res.status(200).json({
      status: "success",
      message: "Cập nhật hồ sơ shop thành công.",
      data: { seller }
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message
    });
  }
};

export const getPublicShop = async (req, res, next) => {
  try {
    const data = await sellerService.getPublicShop(req.params.id);
    if (!data) {
      return res.status(404).json({
        status: "fail",
        message: "Không tìm thấy shop hoặc shop chưa hoạt động."
      });
    }

    res.status(200).json({
      status: "success",
      data
    });
  } catch (err) {
    next(err);
  }
};

// Lấy thống kê của shop
export const getSellerDashboardStats = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    if (!seller) {
      return res.status(404).json({
        status: "fail",
        message: "Không tìm thấy thông tin cửa hàng."
      });
    }

    const stats = await sellerService.getSellerDashboardStats(seller.id);
    res.status(200).json({
      status: "success",
      data: stats
    });
  } catch (err) {
    next(err);
  }
};

// Lấy danh sách sản phẩm của Seller
export const getSellerProducts = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    if (!seller) {
      return res.status(404).json({
        status: "fail",
        message: "Không tìm thấy thông tin cửa hàng."
      });
    }

    const data = await sellerService.getSellerProducts(seller.id, req.query);
    res.status(200).json({
      status: "success",
      results: data.products.length,
      data
    });
  } catch (err) {
    next(err);
  }
};

// Tạo sản phẩm cho Seller
export const createSellerProduct = async (req, res, next) => {
  const transaction = new sql.Transaction(pool);
  let transactionStarted = false;
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    if (!seller) {
      return res.status(404).json({
        status: "fail",
        message: "Không tìm thấy thông tin cửa hàng."
      });
    }

    const {
      name, price, description, categoryId, stock, sku, isActive,
      lowStockThreshold = 5
    } = req.body;
    if (!name || price === undefined || price === null || price === "" || !categoryId) {
      return res.status(400).json({
        status: "fail",
        message: "Tên sản phẩm và Giá cơ bản là bắt buộc!"
      });
    }

    const validationError = validateProductNumbers(
      { price, stock },
      { requirePrice: true }
    );
    if (validationError) {
      return res.status(400).json({ status: "fail", message: validationError });
    }
    if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0 || lowStockThreshold > 1000000) {
      return res.status(400).json({
        status: "fail",
        code: "INVALID_LOW_STOCK_THRESHOLD",
        message: "lowStockThreshold phai la so nguyen tu 0 den 1000000."
      });
    }

    const productId = `prod_${Math.random().toString(36).substr(2, 9)}`;
    const variantId = `var_${Math.random().toString(36).substr(2, 9)}`;
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const basePrice = price;
    const stockQty = stock === undefined ? 0 : stock;
    const productImages = normalizeProductImages(req.body, req.user.id, { useDefault: true });
    const defaultImage = productImages.find((item) => item.isPrimary).url;
    const defaultSku = String(sku || `SKU-${slug.toUpperCase()}`).trim().toUpperCase();
    if (!/^[A-Z0-9._-]{3,100}$/.test(defaultSku)) {
      return res.status(400).json({
        status: "fail",
        code: "INVALID_SKU",
        message: "SKU phải có 3-100 ký tự gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang."
      });
    }

    await transaction.begin();
    transactionStarted = true;
    const reqTx = () => transaction.request();
    const activeCategoryId = await sellerService.assertSellerCategoryAvailable(
      categoryId,
      transaction
    );

    // 1. Chèn vào bảng Products
    await reqTx()
      .input("id", sql.VarChar, productId)
      .input("name", sql.NVarChar, name)
      .input("slug", sql.VarChar, slug)
      .input("description", sql.NVarChar, description || null)
      .input("basePrice", sql.Decimal(18, 2), basePrice)
      .input("sellerId", sql.VarChar, seller.id)
      .input("isActive", sql.Bit, isActive === undefined ? true : Boolean(isActive))
      .query(`
        INSERT INTO Products (id, name, slug, description, base_price, seller_id, is_active, is_featured)
        VALUES (@id, @name, @slug, @description, @basePrice, @sellerId, @isActive, 0)
      `);

    // 2. Chèn vào bảng ProductCategories
    await reqTx()
      .input("productId", sql.VarChar, productId)
      .input("categoryId", sql.VarChar, activeCategoryId)
      .query(`
        INSERT INTO ProductCategories (product_id, category_id)
        VALUES (@productId, @categoryId)
      `);

    // 3. Chèn vào bảng ProductImages
    for (const productImage of productImages) {
      await reqTx()
        .input("id", sql.VarChar, `img_${Math.random().toString(36).substr(2, 9)}`)
        .input("productId", sql.VarChar, productId)
        .input("imageUrl", sql.VarChar, productImage.url)
        .input("publicId", sql.VarChar, productImage.publicId)
        .input("isPrimary", sql.Bit, productImage.isPrimary)
        .input("sortOrder", sql.Int, productImage.sortOrder)
        .query(`
          INSERT INTO ProductImages (
            id, product_id, image_url, public_id, is_primary, sort_order
          ) VALUES (
            @id, @productId, @imageUrl, @publicId, @isPrimary, @sortOrder
          )
        `);
    }

    // 4. Chèn vào bảng ProductVariants làm Variant mặc định để map lên giao diện
    await reqTx()
      .input("id", sql.VarChar, variantId)
      .input("productId", sql.VarChar, productId)
      .input("sku", sql.VarChar, defaultSku)
      .input("price", sql.Decimal(18, 2), basePrice)
      .input("stockQty", sql.Int, stockQty)
      .input("lowStockThreshold", sql.Int, lowStockThreshold)
      .input("imageUrl", sql.VarChar, defaultImage)
      .query(`
        INSERT INTO ProductVariants (
          id, product_id, sku, price, stock_qty, low_stock_threshold,
          image_url, is_active, is_default
        )
        VALUES (
          @id, @productId, @sku, @price, @stockQty, @lowStockThreshold,
          @imageUrl, 1, 1
        )
      `);

    if (stockQty > 0) {
      await recordInventoryLog(transaction, {
        variantId,
        oldQuantity: 0,
        changeQuantity: stockQty,
        newQuantity: stockQty,
        type: INVENTORY_TYPES.RESTOCK,
        referenceId: productId,
        reason: "Tồn kho ban đầu khi tạo sản phẩm.",
        createdBy: req.user.id
      });
    }

    await transaction.commit();
    transactionStarted = false;

    res.status(201).json({
      status: "success",
      message: "Tạo sản phẩm thành công!",
      data: {
        product: {
          id: productId,
          name,
          slug,
          price: basePrice,
          description,
          category: categoryId,
          image: defaultImage,
          images: productImages,
          stock: stockQty,
          variantId,
          sku: defaultSku,
          lowStockThreshold
        }
      }
    });

  } catch (err) {
    if (transactionStarted) {
      try {
        await transaction.rollback();
      } catch (_) {
        // Preserve the original product error.
      }
    }
    res.status(err.statusCode || 400).json({
      status: "fail",
      ...(err.code && { code: err.code }),
      message: err.message
    });
  }
};

// Cập nhật sản phẩm của Seller
export const updateSellerProduct = async (req, res, next) => {
  const transaction = new sql.Transaction(pool);
  let transactionStarted = false;
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    if (!seller) {
      return res.status(404).json({
        status: "fail",
        message: "Không tìm thấy thông tin cửa hàng."
      });
    }

    const productId = req.params.id;

    // Kiểm tra quyền sở hữu sản phẩm
    const productCheck = await pool.request()
      .input("id", sql.VarChar, productId)
      .input("sellerId", sql.VarChar, seller.id)
      .query("SELECT id FROM Products WHERE id = @id AND seller_id = @sellerId");

    if (productCheck.recordset.length === 0) {
      return res.status(403).json({
        status: "fail",
        message: "Bạn không có quyền chỉnh sửa sản phẩm này!"
      });
    }

    const {
      name,
      price,
      description,
      categoryId,
      stock,
      sku,
      isActive,
      lowStockThreshold,
      stockReason
    } = req.body;

    const validationError = validateProductNumbers({ price, stock });
    if (validationError) {
      return res.status(400).json({ status: "fail", message: validationError });
    }
    if (
      lowStockThreshold !== undefined
      && (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0 || lowStockThreshold > 1000000)
    ) {
      return res.status(400).json({
        status: "fail",
        code: "INVALID_LOW_STOCK_THRESHOLD",
        message: "lowStockThreshold phai la so nguyen tu 0 den 1000000."
      });
    }
    const productImages = normalizeProductImages(req.body, req.user.id);
    const hasImageUpdate = productImages !== null;
    const primaryImage = hasImageUpdate
      ? productImages.find((item) => item.isPrimary)
      : null;

    await transaction.begin();
    transactionStarted = true;
    const reqTx = () => transaction.request();
    const activeCategoryId = categoryId
      ? await sellerService.assertSellerCategoryAvailable(categoryId, transaction)
      : null;

    // 1. Cập nhật bảng Products
    if (name || description || price !== undefined || isActive !== undefined) {
      let query = "UPDATE Products SET updated_at = GETDATE()";
      const request = reqTx().input("id", sql.VarChar, productId);

      if (name) {
        query += ", name = @name";
        request.input("name", sql.NVarChar, name);
      }
      if (description !== undefined) {
        query += ", description = @description";
        request.input("description", sql.NVarChar, description || null);
      }
      if (price !== undefined) {
        query += ", base_price = @price";
        request.input("price", sql.Decimal(18, 2), price);
      }
      if (isActive !== undefined) {
        query += ", is_active = @isActive";
        request.input("isActive", sql.Bit, Boolean(isActive));
      }

      query += " WHERE id = @id";
      await request.query(query);
    }

    // 2. Cập nhật Category
    if (activeCategoryId) {
      await reqTx()
        .input("productId", sql.VarChar, productId)
        .input("categoryId", sql.VarChar, activeCategoryId)
        .query(`
          DELETE FROM ProductCategories WHERE product_id = @productId;
          INSERT INTO ProductCategories (product_id, category_id) VALUES (@productId, @categoryId);
        `);
    }

    // 3. Cập nhật ProductImages (chỉ cập nhật ảnh primary hiện có)
    if (hasImageUpdate) {
      await reqTx()
        .input("productId", sql.VarChar, productId)
        .query("DELETE FROM ProductImages WHERE product_id = @productId");
      for (const productImage of productImages) {
        await reqTx()
          .input("id", sql.VarChar, `img_${Math.random().toString(36).substr(2, 9)}`)
          .input("productId", sql.VarChar, productId)
          .input("imageUrl", sql.VarChar, productImage.url)
          .input("publicId", sql.VarChar, productImage.publicId)
          .input("isPrimary", sql.Bit, productImage.isPrimary)
          .input("sortOrder", sql.Int, productImage.sortOrder)
          .query(`
            INSERT INTO ProductImages (
              id, product_id, image_url, public_id, is_primary, sort_order
            ) VALUES (
              @id, @productId, @imageUrl, @publicId, @isPrimary, @sortOrder
            )
          `);
      }
    }

    // 4. Cập nhật ProductVariants
    if (
      price !== undefined || stock !== undefined || hasImageUpdate
      || sku !== undefined || lowStockThreshold !== undefined
    ) {
      // Tìm variant đầu tiên
      const variantRes = await reqTx()
        .input("productId", sql.VarChar, productId)
        .query(`
          SELECT TOP 1 id, stock_qty
          FROM ProductVariants WITH (UPDLOCK, HOLDLOCK)
          WHERE product_id = @productId AND is_default = 1
          ORDER BY id ASC
        `);
      
      const variant = variantRes.recordset[0];
      if (!variant && stock !== undefined) {
        const error = new Error("Không tìm thấy phiên bản sản phẩm để cập nhật tồn kho.");
        error.code = "VARIANT_NOT_FOUND";
        error.statusCode = 404;
        throw error;
      }
      if (variant) {
        const oldQuantity = Number(variant.stock_qty);
        const stockChanged = stock !== undefined && Number(stock) !== oldQuantity;
        const normalizedStockReason = stockChanged
          ? validateInventoryReason(stockReason)
          : null;
        let query = "UPDATE ProductVariants SET updated_at = GETDATE()";
        const request = reqTx().input("variantId", sql.VarChar, variant.id);

        if (price !== undefined) {
          query += ", price = @price";
          request.input("price", sql.Decimal(18, 2), price);
        }
        if (sku !== undefined) {
          const normalizedSku = String(sku).trim().toUpperCase();
          if (!/^[A-Z0-9._-]{3,100}$/.test(normalizedSku)) {
            const error = new Error("SKU phải có 3-100 ký tự hợp lệ.");
            error.code = "INVALID_SKU";
            throw error;
          }
          query += ", sku = @sku";
          request.input("sku", sql.VarChar, normalizedSku);
        }
        if (stock !== undefined) {
          query += ", stock_qty = @stock";
          request.input("stock", sql.Int, stock);
        }
        if (lowStockThreshold !== undefined) {
          query += ", low_stock_threshold = @lowStockThreshold";
          request.input("lowStockThreshold", sql.Int, lowStockThreshold);
        }
        if (hasImageUpdate) {
          query += ", image_url = @image";
          request.input("image", sql.VarChar, primaryImage.url);
        }

        query += " WHERE id = @variantId";
        await request.query(query);

        if (stockChanged) {
          await recordInventoryLog(transaction, {
            variantId: variant.id,
            oldQuantity,
            changeQuantity: Number(stock) - oldQuantity,
            newQuantity: Number(stock),
            type: INVENTORY_TYPES.MANUAL_ADJUSTMENT,
            referenceId: productId,
            reason: normalizedStockReason,
            createdBy: req.user.id
          });
        }
      }
    }

    await transaction.commit();
    transactionStarted = false;

    res.status(200).json({
      status: "success",
      message: "Cập nhật sản phẩm thành công!"
    });

  } catch (err) {
    if (transactionStarted) {
      try {
        await transaction.rollback();
      } catch (_) {
        // Preserve the original product error.
      }
    }
    res.status(err.statusCode || 400).json({
      status: "fail",
      ...(err.code && { code: err.code }),
      message: err.message
    });
  }
};

// Xóa sản phẩm
export const deleteSellerProduct = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    if (!seller) {
      return res.status(404).json({
        status: "fail",
        message: "Không tìm thấy thông tin cửa hàng."
      });
    }

    const productId = req.params.id;

    // Kiểm tra quyền sở hữu sản phẩm trước khi xóa
    const productCheck = await pool.request()
      .input("id", sql.VarChar, productId)
      .input("sellerId", sql.VarChar, seller.id)
      .query("SELECT id FROM Products WHERE id = @id AND seller_id = @sellerId");

    if (productCheck.recordset.length === 0) {
      return res.status(403).json({
        status: "fail",
        message: "Bạn không có quyền xóa sản phẩm này!"
      });
    }

    await pool.request()
      .input("id", sql.VarChar, productId)
      .query("UPDATE Products SET is_active = 0, updated_at = GETDATE() WHERE id = @id");

    res.status(200).json({
      status: "success",
      message: "Sản phẩm đã được ẩn khỏi gian hàng."
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message
    });
  }
};

// Lấy các đơn hàng liên quan đến Seller
export const getSellerOrders = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    if (!seller) {
      return res.status(404).json({
        status: "fail",
        message: "Không tìm thấy thông tin cửa hàng."
      });
    }

    const data = await sellerService.getSellerOrders(seller.id, req.query);
    res.status(200).json({
      status: "success",
      results: data.orders.length,
      data
    });
  } catch (err) {
    next(err);
  }
};

export const getSellerOrderTimeline = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    if (!seller) {
      return res.status(404).json({
        status: "fail",
        code: "SELLER_NOT_FOUND",
        message: "Không tìm thấy thông tin cửa hàng."
      });
    }

    const timeline = await loadSellerOrderTimeline(seller.id, req.params.orderId);
    return res.status(200).json({ status: "success", data: timeline });
  } catch (error) {
    if (error.code) {
      return res.status(error.statusCode || 400).json({
        status: "fail",
        code: error.code,
        message: error.message
      });
    }
    next(error);
  }
};

// Lấy lịch sử chat với đối tác
export const updateSellerOrderItem = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    if (!seller) {
      return res.status(404).json({
        status: "fail",
        message: "Không tìm thấy thông tin cửa hàng."
      });
    }

    const orderItem = await sellerService.updateSellerOrderItem(
      seller.id,
      req.user.id,
      req.params.itemId,
      req.body
    );
    return res.status(200).json({
      status: "success",
      message: orderItem.changed
        ? "Cập nhật trạng thái đơn hàng thành công."
        : "Trạng thái đơn hàng không thay đổi.",
      data: { orderItem }
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      status: "fail",
      ...(err.code ? { code: err.code } : {}),
      message: err.message
    });
  }
};

export const getSellerCategories = async (req, res, next) => {
  try {
    const categories = await sellerService.getSellerCategories();
    res.status(200).json({
      status: "success",
      data: { categories }
    });
  } catch (err) {
    next(err);
  }
};

export const getSellerCoupons = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    if (!seller) {
      return res.status(404).json({
        status: "fail",
        message: "Không tìm thấy thông tin cửa hàng."
      });
    }

    const data = await sellerService.getSellerCoupons(seller.id, req.query);
    res.status(200).json({
      status: "success",
      data
    });
  } catch (err) {
    next(err);
  }
};

export const createSellerCoupon = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    if (!seller) {
      return res.status(404).json({
        status: "fail",
        message: "Không tìm thấy thông tin cửa hàng."
      });
    }

    const coupon = await sellerService.createSellerCoupon(seller.id, req.body);
    res.status(201).json({
      status: "success",
      message: "Tạo voucher thành công.",
      data: { coupon }
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message
    });
  }
};

export const updateSellerCoupon = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    if (!seller) {
      return res.status(404).json({
        status: "fail",
        message: "Không tìm thấy thông tin cửa hàng."
      });
    }

    await sellerService.updateSellerCoupon(seller.id, req.params.id, req.body);
    res.status(200).json({
      status: "success",
      message: "Cập nhật voucher thành công."
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message
    });
  }
};

export const deleteSellerCoupon = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    if (!seller) {
      return res.status(404).json({
        status: "fail",
        message: "Khong tim thay thong tin cua hang."
      });
    }

    await sellerService.deleteSellerCoupon(seller.id, req.params.id);
    res.status(200).json({
      status: "success",
      message: "Voucher da duoc tat."
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message
    });
  }
};

export const getChatHistory = async (req, res, next) => {
  try {
    const { partnerId } = req.params;
    const currentUserId = req.user.id;
    const history = await messageService.getChatHistory(currentUserId, partnerId);
    res.status(200).json({
      status: "success",
      data: { history }
    });
  } catch (err) {
    next(err);
  }
};

// Lấy danh sách bạn chat gần đây
export const getRecentChats = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const chats = await messageService.getRecentChatsForSeller(currentUserId);
    res.status(200).json({
      status: "success",
      data: { chats }
    });
  } catch (err) {
    next(err);
  }
};

// Đánh dấu tin nhắn đã đọc
export const markChatAsRead = async (req, res, next) => {
  try {
    const { senderId } = req.params;
    const currentUserId = req.user.id;
    await messageService.markAsRead(senderId, currentUserId);
    res.status(200).json({
      status: "success",
      message: "Đã đánh dấu đã xem"
    });
  } catch (err) {
    next(err);
  }
};
