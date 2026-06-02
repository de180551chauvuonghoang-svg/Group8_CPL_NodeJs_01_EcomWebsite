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

    // 1. Validate Data URI format and extract Base64 data & MIME type
    const matches = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({
        status: "fail",
        message: "Định dạng dữ liệu hình ảnh không hợp lệ. Vui lòng gửi dạng Data URI Base64."
      });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    // 2. Validate MIME type allowed formats
    const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
      return res.status(400).json({
        status: "fail",
        message: "Chỉ cho phép tải lên các định dạng ảnh: JPG, JPEG, PNG, WEBP."
      });
    }

    // 3. Enforce maximum file size (4MB limit)
    const sizeInBytes = Math.round((base64Data.length * 3) / 4);
    if (sizeInBytes > 4 * 1024 * 1024) {
      return res.status(400).json({
        status: "fail",
        message: "Dung lượng ảnh vượt quá giới hạn tối đa cho phép (4MB)."
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
