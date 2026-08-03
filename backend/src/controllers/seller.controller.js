import { sellerService } from "../services/sellerService.js";
import { messageService } from "../services/messageService.js";
import { getSellerOrderTimeline as loadSellerOrderTimeline } from "../services/orderTimelineService.js";
import {
  normalizeSellerContact,
  validateSellerContact,
} from "../utils/sellerValidation.js";

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
      bankAccountHolder,
    } = req.body;
    const userId = req.user.id;
    const normalizedShopName =
      typeof shopName === "string" ? shopName.trim() : "";
    const normalizedShopAddress =
      typeof shopAddress === "string" ? shopAddress.trim() : "";

    if (!normalizedShopName || !shopPhone || !normalizedShopAddress) {
      return res.status(400).json({
        status: "fail",
        message:
          "Vui lòng cung cấp đầy đủ tên, số điện thoại và địa chỉ cửa hàng!",
      });
    }

    const validationError = validateSellerContact({
      shopPhone,
      identityNumber,
      bankAccountNo,
    });
    if (validationError) {
      return res.status(400).json({ status: "fail", message: validationError });
    }
    const normalizedContact = normalizeSellerContact({
      shopPhone,
      identityNumber,
      bankAccountNo,
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
      bankAccountHolder,
    });

    res.status(200).json({
      status: "success",
      message: "Yêu cầu mở cửa hàng đã được gửi và đang chờ duyệt.",
      data: {
        application: {
          sellerId: result.sellerId,
          status: result.status,
        },
      },
    });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      status: "fail",
      ...(err.code && { code: err.code }),
      message: err.message,
    });
  }
};

export const getSellerApplication = async (req, res, next) => {
  try {
    const application = await sellerService.getSellerApplicationByUserId(
      req.user.id,
    );
    return res.status(200).json({
      status: "success",
      data: { application },
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
        message: "Bạn chưa đăng ký làm người bán hàng.",
      });
    }

    res.status(200).json({
      status: "success",
      data: { seller },
    });
  } catch (err) {
    next(err);
  }
};

export const updateSellerProfile = async (req, res, next) => {
  try {
    const { shopName, shopPhone, shopAddress, identityNumber, bankAccountNo } =
      req.body;
    if (!shopName || !shopPhone || !shopAddress) {
      return res.status(400).json({
        status: "fail",
        message: "Tên shop, số điện thoại và địa chỉ shop là bắt buộc.",
      });
    }

    const validationError = validateSellerContact({
      shopPhone,
      identityNumber,
      bankAccountNo,
    });
    if (validationError) {
      return res.status(400).json({ status: "fail", message: validationError });
    }

    const normalizedContact = normalizeSellerContact({
      shopPhone,
      identityNumber,
      bankAccountNo,
    });
    const seller = await sellerService.updateSellerProfile(req.user.id, {
      ...req.body,
      ...normalizedContact,
    });
    res.status(200).json({
      status: "success",
      message: "Cập nhật hồ sơ shop thành công.",
      data: { seller },
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};

export const getPublicShop = async (req, res, next) => {
  try {
    const data = await sellerService.getPublicShop(req.params.id);
    if (!data) {
      return res.status(404).json({
        status: "fail",
        message: "Không tìm thấy shop hoặc shop chưa hoạt động.",
      });
    }

    res.status(200).json({
      status: "success",
      data,
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
        message: "Không tìm thấy thông tin cửa hàng.",
      });
    }

    const stats = await sellerService.getSellerDashboardStats(seller.id);
    res.status(200).json({
      status: "success",
      data: stats,
    });
  } catch (err) {
    next(err);
  }
};

// Lấy danh sách sản phẩm của Seller
export const getSellerOrders = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    if (!seller) {
      return res.status(404).json({
        status: "fail",
        message: "Không tìm thấy thông tin cửa hàng.",
      });
    }

    const data = await sellerService.getSellerOrders(seller.id, req.query);
    res.status(200).json({
      status: "success",
      results: data.orders.length,
      data,
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
        message: "Không tìm thấy thông tin cửa hàng.",
      });
    }

    const timeline = await loadSellerOrderTimeline(
      seller.id,
      req.params.orderId,
    );
    return res.status(200).json({ status: "success", data: timeline });
  } catch (error) {
    if (error.code) {
      return res.status(error.statusCode || 400).json({
        status: "fail",
        code: error.code,
        message: error.message,
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
        message: "Không tìm thấy thông tin cửa hàng.",
      });
    }

    const orderItem = await sellerService.updateSellerOrderItem(
      seller.id,
      req.user.id,
      req.params.itemId,
      req.body,
    );
    return res.status(200).json({
      status: "success",
      message: orderItem.changed
        ? "Cập nhật trạng thái đơn hàng thành công."
        : "Trạng thái đơn hàng không thay đổi.",
      data: { orderItem },
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      status: "fail",
      ...(err.code ? { code: err.code } : {}),
      message: err.message,
    });
  }
};

export const getSellerCategories = async (req, res, next) => {
  try {
    const categories = await sellerService.getSellerCategories();
    res.status(200).json({
      status: "success",
      data: { categories },
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
        message: "Không tìm thấy thông tin cửa hàng.",
      });
    }

    const data = await sellerService.getSellerCoupons(seller.id, req.query);
    res.status(200).json({
      status: "success",
      data,
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
        message: "Không tìm thấy thông tin cửa hàng.",
      });
    }

    const coupon = await sellerService.createSellerCoupon(seller.id, req.body);
    res.status(201).json({
      status: "success",
      message: "Tạo voucher thành công.",
      data: { coupon },
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};

export const updateSellerCoupon = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    if (!seller) {
      return res.status(404).json({
        status: "fail",
        message: "Không tìm thấy thông tin cửa hàng.",
      });
    }

    await sellerService.updateSellerCoupon(seller.id, req.params.id, req.body);
    res.status(200).json({
      status: "success",
      message: "Cập nhật voucher thành công.",
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};

export const deleteSellerCoupon = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    if (!seller) {
      return res.status(404).json({
        status: "fail",
        message: "Khong tim thay thong tin cua hang.",
      });
    }

    await sellerService.deleteSellerCoupon(seller.id, req.params.id);
    res.status(200).json({
      status: "success",
      message: "Voucher da duoc tat.",
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};

export const getChatHistory = async (req, res, next) => {
  try {
    const { partnerId } = req.params;
    const currentUserId = req.user.id;
    const history = await messageService.getChatHistory(
      currentUserId,
      partnerId,
    );
    res.status(200).json({
      status: "success",
      data: { history },
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
      data: { chats },
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
      message: "Đã đánh dấu đã xem",
    });
  } catch (err) {
    next(err);
  }
};
