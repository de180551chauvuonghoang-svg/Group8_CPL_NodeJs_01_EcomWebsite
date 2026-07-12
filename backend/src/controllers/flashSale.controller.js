import { sellerService } from "../services/sellerService.js";
import { flashSaleService } from "../services/flashSaleService.js";

const getCurrentSeller = async (userId) => {
  const seller = await sellerService.getSellerByUserId(userId);
  if (!seller) {
    const err = new Error("Khong tim thay thong tin cua hang.");
    err.statusCode = 404;
    throw err;
  }
  return seller;
};

export const createFlashSale = async (req, res) => {
  try {
    const seller = await getCurrentSeller(req.user.id);
    const flashSale = await flashSaleService.createFlashSale(seller.id, req.body);
    res.status(201).json({ status: "success", data: { flashSale } });
  } catch (err) {
    res.status(err.statusCode || 400).json({ status: "fail", message: err.message });
  }
};

export const getFlashSales = async (req, res) => {
  try {
    const seller = await getCurrentSeller(req.user.id);
    const flashSales = await flashSaleService.getFlashSales(seller.id);
    res.status(200).json({ status: "success", data: { flashSales } });
  } catch (err) {
    res.status(err.statusCode || 400).json({ status: "fail", message: err.message });
  }
};

export const updateFlashSale = async (req, res) => {
  try {
    const seller = await getCurrentSeller(req.user.id);
    await flashSaleService.updateFlashSale(seller.id, req.params.id, req.body);
    res.status(200).json({ status: "success", message: "Flash sale updated." });
  } catch (err) {
    res.status(err.statusCode || 400).json({ status: "fail", message: err.message });
  }
};

export const deleteFlashSale = async (req, res) => {
  try {
    const seller = await getCurrentSeller(req.user.id);
    await flashSaleService.deleteFlashSale(seller.id, req.params.id);
    res.status(200).json({ status: "success", message: "Flash sale disabled." });
  } catch (err) {
    res.status(err.statusCode || 400).json({ status: "fail", message: err.message });
  }
};
