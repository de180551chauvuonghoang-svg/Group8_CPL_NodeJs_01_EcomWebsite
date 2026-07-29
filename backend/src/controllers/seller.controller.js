import { sellerService } from "../services/sellerService.js";
import { messageService } from "../services/messageService.js";
import { sql, pool } from "../config/db.js";

// Đăng ký làm Seller — tạo đơn ở trạng thái chờ duyệt, KHÔNG cấp quyền seller ngay
export const registerSeller = async (req, res, next) => {
  try {
    // Admin là tài khoản quản lý riêng, không được phép mở thêm shop bán hàng
    if (req.user.role === "admin") {
      return res.status(403).json({
        status: "fail",
        message: "Tài khoản admin không thể đăng ký làm seller."
      });
    }

    const {
      shopName,
      shopPhone,
      shopAddress,
      description,
      logoUrl,
      coverUrl,
      pickupAddress,
      identityName,
      identityNumber,
      bankName,
      bankAccountNo,
      bankAccountHolder
    } = req.body;
    const userId = req.user.id;

    if (!shopName || !shopPhone || !shopAddress) {
      return res.status(400).json({
        status: "fail",
        message: "Vui lòng cung cấp đầy đủ tên, số điện thoại và địa chỉ cửa hàng!"
      });
    }

    const result = await sellerService.registerSeller({
      userId,
      shopName,
      shopPhone,
      shopAddress,
      description,
      logoUrl,
      coverUrl,
      pickupAddress,
      identityName,
      identityNumber,
      bankName,
      bankAccountNo,
      bankAccountHolder
    });

    res.status(200).json({
      status: "success",
      message: result.sellerStatus === "pending"
        ? "Đơn đăng ký Kênh Người Bán đã được gửi. Vui lòng chờ admin duyệt!"
        : "Bạn đã có shop rồi.",
      data: {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          avatar_url: result.user.avatar_url,
          role: result.user.role
        },
        sellerId: result.sellerId,
        sellerStatus: result.sellerStatus
      }
    });

  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message
    });
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
    const seller = await sellerService.updateSellerProfile(req.user.id, req.body);
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

    const products = await sellerService.getSellerProducts(seller.id);
    res.status(200).json({
      status: "success",
      results: products.length,
      data: { products }
    });
  } catch (err) {
    next(err);
  }
};

// Tạo sản phẩm cho Seller
export const createSellerProduct = async (req, res, next) => {
  const transaction = new sql.Transaction(pool);
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    if (!seller) {
      return res.status(404).json({
        status: "fail",
        message: "Không tìm thấy thông tin cửa hàng."
      });
    }

    const { name, price, description, categoryId, brandId, image, stock, isActive } = req.body;
    if (!name || !price || !categoryId) {
      return res.status(400).json({
        status: "fail",
        message: "Tên sản phẩm và Giá cơ bản là bắt buộc!"
      });
    }

    const productId = `prod_${Math.random().toString(36).substr(2, 9)}`;
    const variantId = `var_${Math.random().toString(36).substr(2, 9)}`;
    const imageId = `img_${Math.random().toString(36).substr(2, 9)}`;
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const basePrice = parseFloat(price) || 0;
    const stockQty = parseInt(stock) || 0;
    const defaultImage = image || "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80";

    await transaction.begin();
    const reqTx = () => transaction.request();

    // 1. Chèn vào bảng Products
    await reqTx()
      .input("id", sql.VarChar, productId)
      .input("name", sql.NVarChar, name)
      .input("slug", sql.VarChar, slug)
      .input("description", sql.NVarChar, description || null)
      .input("basePrice", sql.Decimal(18, 2), basePrice)
      .input("sellerId", sql.VarChar, seller.id)
      .input("brandId", sql.VarChar, brandId || null)
      .input("isActive", sql.Bit, isActive === undefined ? true : Boolean(isActive))
      .query(`
        INSERT INTO Products (id, name, slug, description, base_price, seller_id, brand_id, is_active, is_featured)
        VALUES (@id, @name, @slug, @description, @basePrice, @sellerId, @brandId, @isActive, 0)
      `);

    // 2. Chèn vào bảng ProductCategories
    await reqTx()
      .input("productId", sql.VarChar, productId)
      .input("categoryId", sql.VarChar, categoryId)
      .query(`
        INSERT INTO ProductCategories (product_id, category_id)
        VALUES (@productId, @categoryId)
      `);

    // 3. Chèn vào bảng ProductImages
    await reqTx()
      .input("id", sql.VarChar, imageId)
      .input("productId", sql.VarChar, productId)
      .input("imageUrl", sql.VarChar, defaultImage)
      .query(`
        INSERT INTO ProductImages (id, product_id, image_url, is_primary, sort_order)
        VALUES (@id, @productId, @imageUrl, 1, 0)
      `);

    // 4. Chèn vào bảng ProductVariants làm Variant mặc định để map lên giao diện
    await reqTx()
      .input("id", sql.VarChar, variantId)
      .input("productId", sql.VarChar, productId)
      .input("sku", sql.VarChar, `SKU-${slug.toUpperCase()}`)
      .input("price", sql.Decimal(18, 2), basePrice)
      .input("stockQty", sql.Int, stockQty)
      .input("imageUrl", sql.VarChar, defaultImage)
      .query(`
        INSERT INTO ProductVariants (id, product_id, sku, price, stock_qty, image_url)
        VALUES (@id, @productId, @sku, @price, @stockQty, @imageUrl)
      `);

    await transaction.commit();

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
          stock: stockQty
        }
      }
    });

  } catch (err) {
    await transaction.rollback();
    res.status(400).json({
      status: "fail",
      message: err.message
    });
  }
};

// Cập nhật sản phẩm của Seller
export const updateSellerProduct = async (req, res, next) => {
  const transaction = new sql.Transaction(pool);
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

    const { name, price, description, categoryId, brandId, image, stock, isActive } = req.body;

    await transaction.begin();
    const reqTx = () => transaction.request();

    // 1. Cập nhật bảng Products
    if (name || description || price !== undefined || isActive !== undefined || brandId !== undefined) {
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
        request.input("price", sql.Decimal(18, 2), parseFloat(price));
      }
      if (isActive !== undefined) {
        query += ", is_active = @isActive";
        request.input("isActive", sql.Bit, Boolean(isActive));
      }
      if (brandId !== undefined) {
        query += ", brand_id = @brandId";
        request.input("brandId", sql.VarChar, brandId || null);
      }

      query += " WHERE id = @id";
      await request.query(query);
    }

    // 2. Cập nhật Category
    if (categoryId) {
      await reqTx()
        .input("productId", sql.VarChar, productId)
        .input("categoryId", sql.VarChar, categoryId)
        .query(`
          DELETE FROM ProductCategories WHERE product_id = @productId;
          INSERT INTO ProductCategories (product_id, category_id) VALUES (@productId, @categoryId);
        `);
    }

    // 3. Cập nhật ProductImages (chỉ cập nhật ảnh primary hiện có)
    if (image) {
      await reqTx()
        .input("productId", sql.VarChar, productId)
        .input("imageUrl", sql.VarChar, image)
        .query(`
          UPDATE ProductImages SET image_url = @imageUrl WHERE product_id = @productId AND is_primary = 1
        `);
    }

    // 4. Cập nhật ProductVariants
    if (price !== undefined || stock !== undefined || image) {
      // Tìm variant đầu tiên
      const variantRes = await pool.request()
        .input("productId", sql.VarChar, productId)
        .query("SELECT TOP 1 id FROM ProductVariants WHERE product_id = @productId");
      
      const variant = variantRes.recordset[0];
      if (variant) {
        let query = "UPDATE ProductVariants SET id = id";
        const request = reqTx().input("variantId", sql.VarChar, variant.id);

        if (price !== undefined) {
          query += ", price = @price";
          request.input("price", sql.Decimal(18, 2), parseFloat(price));
        }
        if (stock !== undefined) {
          query += ", stock_qty = @stock";
          request.input("stock", sql.Int, parseInt(stock));
        }
        if (image) {
          query += ", image_url = @image";
          request.input("image", sql.VarChar, image);
        }

        query += " WHERE id = @variantId";
        await request.query(query);
      }
    }

    await transaction.commit();

    res.status(200).json({
      status: "success",
      message: "Cập nhật sản phẩm thành công!"
    });

  } catch (err) {
    await transaction.rollback();
    res.status(400).json({
      status: "fail",
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

    const orders = await sellerService.getSellerOrders(seller.id);
    res.status(200).json({
      status: "success",
      results: orders.length,
      data: { orders }
    });
  } catch (err) {
    next(err);
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

    await sellerService.updateSellerOrderItem(seller.id, req.params.itemId, req.body);
    res.status(200).json({
      status: "success",
      message: "Cập nhật đơn hàng thành công."
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message
    });
  }
};

export const getSellerBrands = async (req, res, next) => {
  try {
    const brands = await sellerService.getSellerBrands();
    res.status(200).json({
      status: "success",
      data: { brands }
    });
  } catch (err) {
    next(err);
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

    const coupons = await sellerService.getSellerCoupons(seller.id);
    res.status(200).json({
      status: "success",
      data: { coupons }
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
