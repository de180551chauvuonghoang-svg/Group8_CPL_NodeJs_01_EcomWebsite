import { adminService } from "../services/adminService.js";

// Public: chỉ trả banner đang active và nằm trong khoảng starts_at/ends_at — dùng cho trang chủ (A004)
export const getPublicBanners = async (req, res, next) => {
  try {
    const banners = await adminService.listBanners({ activeOnly: true });
    res.status(200).json({
      status: "success",
      results: banners.length,
      data: { banners }
    });
  } catch (err) {
    next(err);
  }
};
