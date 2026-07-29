import { sellerService } from "../services/sellerService.js";
import { sellerDashboardTaskService } from "../services/sellerDashboardTaskService.js";

export const getSellerDashboardTasks = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    if (!seller) {
      return res.status(404).json({
        status: "fail",
        code: "SELLER_NOT_FOUND",
        message: "Không tìm thấy thông tin cửa hàng."
      });
    }

    const tasks = await sellerDashboardTaskService.getTasks(seller.id, req.user.id);
    const data = {
      ordersToProcess: tasks.orders_to_process,
      overdueOrders: tasks.overdue_orders,
      unreadMessages: tasks.unread_messages,
      outOfStockProducts: tasks.out_of_stock_products,
      lowStockProducts: tasks.low_stock_products,
      unrepliedReviews: tasks.unreplied_reviews,
      pendingReturns: tasks.pending_returns,
      overdueAfterHours: tasks.overdue_after_hours
    };

    return res.status(200).json({ status: "success", data });
  } catch (error) {
    return next(error);
  }
};
