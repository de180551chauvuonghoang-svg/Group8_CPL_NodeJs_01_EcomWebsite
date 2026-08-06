import { sellerService } from "../services/sellerService.js";
import {
  getFinanceSummary,
  getFinanceTransactions
} from "../services/sellerFinanceService.js";

export const showSellerFinanceSummary = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    const data = await getFinanceSummary(seller.id, req.query);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    return next(error);
  }
};
export const listSellerFinanceTransactions = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    const data = await getFinanceTransactions(seller.id, req.query);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    return next(error);
  }
};
