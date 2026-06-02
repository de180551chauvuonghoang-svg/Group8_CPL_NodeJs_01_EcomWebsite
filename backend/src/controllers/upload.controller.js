import cloudinary from '../config/cloudinary.js';

/**
 * Upload Image Base64 directly to Cloudinary
 */
export const uploadImage = async (req, res, next) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({
        status: "fail",
        message: "Vui lòng cung cấp dữ liệu hình ảnh (Base64)."
      });
    }

    // Upload directly using Cloudinary SDK
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: "volitify_avatars",
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
      transformation: [{ width: 400, height: 400, crop: "limit" }]
    });

    res.status(200).json({
      status: "success",
      message: "Tải ảnh lên thành công",
      secure_url: uploadResponse.secure_url
    });
  } catch (error) {
    console.error("[🚨 Cloudinary Server Upload Error]", error.message);
    res.status(500).json({
      status: "error",
      message: "Lỗi kết nối tới dịch vụ lưu trữ ảnh Cloudinary: " + error.message
    });
  }
};
