import { sellerService } from "../services/sellerService.js";
import {
  followShop,
  getFollowStatus,
  getSellerFollowerStats,
  unfollowShop
} from "../services/shopFollowService.js";

export const createShopFollow = async (req, res, next) => {
  try {
    const data = await followShop(req.user.id, req.params.shopId);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    return next(error);
  }
};
export const deleteShopFollow = async (req, res, next) => {
  try {
    const data = await unfollowShop(req.user.id, req.params.shopId);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    return next(error);
  }
};

export const showShopFollowStatus = async (req, res, next) => {
  try {
    const data = await getFollowStatus(req.user.id, req.params.shopId);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    return next(error);
  }
};

export const showSellerFollowerStats = async (req, res, next) => {
  try {
    const seller = await sellerService.getSellerByUserId(req.user.id);
    const data = await getSellerFollowerStats(seller.id);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    return next(error);
  }
};
