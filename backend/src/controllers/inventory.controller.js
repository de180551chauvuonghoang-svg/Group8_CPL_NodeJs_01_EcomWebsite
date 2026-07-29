import { sellerService } from "../services/sellerService.js";
import { inventoryService } from "../services/inventoryService.js";

const getCurrentSeller = async (userId) => {
  const seller = await sellerService.getSellerByUserId(userId);
  if (!seller) {
    const error = new Error("Không tìm thấy thông tin cửa hàng.");
    error.code = "SELLER_NOT_FOUND";
    error.statusCode = 404;
    error.status = "fail";
    throw error;
  }
  return seller;
};

const handleInventoryError = (error, res, next) => {
  if (!error.code) return next(error);
  return res.status(error.statusCode || 400).json({
    status: "fail",
    code: error.code,
    message: error.message
  });
};

export const getLowStockInventory = async (req, res, next) => {
  try {
    const seller = await getCurrentSeller(req.user.id);
    const data = await inventoryService.getLowStock(seller.id, req.query);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    return handleInventoryError(error, res, next);
  }
};

export const getInventoryLogs = async (req, res, next) => {
  try {
    const seller = await getCurrentSeller(req.user.id);
    const data = await inventoryService.getLogs(seller.id, req.query);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    return handleInventoryError(error, res, next);
  }
};

export const adjustInventory = async (req, res, next) => {
  try {
    const seller = await getCurrentSeller(req.user.id);
    const data = await inventoryService.adjustStock(seller.id, req.user.id, req.body);
    return res.status(200).json({
      status: "success",
      message: "Điều chỉnh tồn kho thành công.",
      data
    });
  } catch (error) {
    return handleInventoryError(error, res, next);
  }
};

export const updateVariantStockAlert = async (req, res, next) => {
  try {
    const seller = await getCurrentSeller(req.user.id);
    const variant = await inventoryService.updateStockAlert(
      seller.id,
      req.params.productId,
      req.params.variantId,
      req.body?.lowStockThreshold
    );
    return res.status(200).json({
      status: "success",
      message: "Cập nhật ngưỡng cảnh báo tồn kho thành công.",
      data: { variant }
    });
  } catch (error) {
    return handleInventoryError(error, res, next);
  }
};
