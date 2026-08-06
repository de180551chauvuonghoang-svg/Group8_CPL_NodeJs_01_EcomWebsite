import { reviewService } from "../services/reviewService.js";

const handleReviewError = (error, res, next) => {
  if (!error.code) {
    next(error);
    return;
  }

  res.status(error.statusCode || 400).json({
    status: "fail",
    code: error.code,
    message: error.message
  });
};

export const getProductReviews = async (req, res, next) => {
  try {
    const data = await reviewService.getPublicReviews(req.params.productId, req.query);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    handleReviewError(error, res, next);
  }
};

export const getReviewableItems = async (req, res, next) => {
  try {
    const items = await reviewService.getReviewableItems(req.user.id);
    return res.status(200).json({
      status: "success",
      results: items.length,
      data: { items }
    });
  } catch (error) {
    handleReviewError(error, res, next);
  }
};

export const getMyReviews = async (req, res, next) => {
  try {
    const data = await reviewService.getMyReviews(req.user.id, req.query);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    handleReviewError(error, res, next);
  }
};

export const createProductReview = async (req, res, next) => {
  try {
    const review = await reviewService.createReview(
      req.user.id,
      req.params.productId,
      req.body
    );
    return res.status(201).json({
      status: "success",
      message: "Đánh giá sản phẩm thành công.",
      data: { review }
    });
  } catch (error) {
    handleReviewError(error, res, next);
  }
};

export const updateProductReview = async (req, res, next) => {
  try {
    const review = await reviewService.updateReview(
      req.user.id,
      req.params.reviewId,
      req.body
    );
    return res.status(200).json({
      status: "success",
      message: "Cập nhật đánh giá thành công.",
      data: { review }
    });
  } catch (error) {
    handleReviewError(error, res, next);
  }
};

export const deleteProductReview = async (req, res, next) => {
  try {
    await reviewService.deleteReview(req.user.id, req.params.reviewId);
    return res.status(200).json({
      status: "success",
      message: "Xóa đánh giá thành công."
    });
  } catch (error) {
    handleReviewError(error, res, next);
  }
};

export const getSellerReviews = async (req, res, next) => {
  try {
    const data = await reviewService.getSellerReviews(req.user.id, req.query);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    handleReviewError(error, res, next);
  }
};

export const replyToProductReview = async (req, res, next) => {
  try {
    const review = await reviewService.replyToReview(
      req.user.id,
      req.params.reviewId,
      req.body?.reply
    );
    return res.status(200).json({
      status: "success",
      message: "Phản hồi đánh giá thành công.",
      data: { review }
    });
  } catch (error) {
    handleReviewError(error, res, next);
  }
};
