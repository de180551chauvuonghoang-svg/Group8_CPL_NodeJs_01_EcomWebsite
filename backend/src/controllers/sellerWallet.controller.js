import {
  getSellerWallet,
  getWalletTransactions,
} from "../services/sellerWalletQueryService.js";
import {
  cancelWithdrawal,
  createWithdrawal,
  listSellerWithdrawals,
} from "../services/sellerWithdrawalService.js";

export const showSellerWallet = async (req, res, next) => {
  try {
    const data = await getSellerWallet(req.activeSeller.id);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    return next(error);
  }
};

export const listSellerWalletTransactions = async (req, res, next) => {
  try {
    const data = await getWalletTransactions(req.activeSeller.id, req.query);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    return next(error);
  }
};

export const requestSellerWithdrawal = async (req, res, next) => {
  try {
    const withdrawal = await createWithdrawal(req.activeSeller.id, req.body);
    return res.status(201).json({
      status: "success",
      message: "Yeu cau rut tien da duoc tao.",
      data: { withdrawal },
    });
  } catch (error) {
    return next(error);
  }
};

export const listSellerWithdrawalRequests = async (req, res, next) => {
  try {
    const data = await listSellerWithdrawals(req.activeSeller.id, req.query);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    return next(error);
  }
};

export const cancelSellerWithdrawalRequest = async (req, res, next) => {
  try {
    const withdrawal = await cancelWithdrawal(
      req.activeSeller.id,
      req.params.id,
    );
    return res.status(200).json({
      status: "success",
      message: "Yeu cau rut tien da duoc huy.",
      data: { withdrawal },
    });
  } catch (error) {
    return next(error);
  }
};
