import {
  listAdminWithdrawals,
  processWithdrawal
} from "../services/sellerWalletService.js";

export const listWithdrawalRequestsForAdmin = async (req, res, next) => {
  try {
    const data = await listAdminWithdrawals(req.query);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    return next(error);
  }
};

export const updateWithdrawalRequestForAdmin = async (req, res, next) => {
  try {
    const withdrawal = await processWithdrawal(
      req.user.id,
      req.params.id,
      req.body
    );
    return res.status(200).json({
      status: "success",
      message: req.body.status === "approved"
        ? "Yeu cau rut tien da duoc duyet."
        : "Yeu cau rut tien da bi tu choi.",
      data: { withdrawal }
    });
  } catch (error) {
    return next(error);
  }
};
