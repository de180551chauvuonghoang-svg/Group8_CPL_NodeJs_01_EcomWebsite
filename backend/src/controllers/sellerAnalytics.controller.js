import { sellerService } from "../services/sellerService.js";
import { sellerAnalyticsService } from "../services/sellerAnalyticsService.js";

export const getSellerDashboardAnalytics = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    if (!seller) {
      return res.status(404).json({
        status: "fail",
        code: "SELLER_NOT_FOUND",
        message: "Không tìm thấy thông tin cửa hàng."
      });
    }

    const data = await sellerAnalyticsService.getDashboardAnalytics(seller.id, req.query);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    if (error.code) {
      return res.status(error.statusCode || 400).json({
        status: "fail",
        code: error.code,
        message: error.message
      });
    }
    return next(error);
  }
};
