import { sellerService } from "../services/sellerService.js";
import {
  createReturnRequest,
  getCustomerReturns,
  getSellerReturnDetail,
  getSellerReturns,
  updateSellerReturn
} from "../services/returnService.js";

export const requestOrderItemReturn = async (req, res, next) => {
  try {
    const result = await createReturnRequest(req.user.id, req.params.itemId, req.body);
    return res.status(201).json({ status: "success", data: { return: result } });
  } catch (error) {
    return next(error);
  }
};
export const listMyReturns = async (req, res, next) => {
  try {
    const data = await getCustomerReturns(req.user.id, req.query);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    return next(error);
  }
};

export const listSellerReturns = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    const data = await getSellerReturns(seller.id, req.query);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    return next(error);
  }
};

export const showSellerReturn = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    const data = await getSellerReturnDetail(seller.id, req.params.returnId);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    return next(error);
  }
};

export const changeSellerReturnStatus = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    const result = await updateSellerReturn(
      seller.id,
      req.user.id,
      req.params.returnId,
      req.body
    );
    return res.status(200).json({ status: "success", data: { return: result } });
  } catch (error) {
    return next(error);
  }
};
