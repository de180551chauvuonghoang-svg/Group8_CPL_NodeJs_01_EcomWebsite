import cloudinary from "../config/cloudinary.js";

const ALLOWED_PURPOSES = new Set(["product", "shop_logo", "shop_cover"]);

const detectImageMimeType = (buffer) => {
  if (!Buffer.isBuffer(buffer)) return null;
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12
    && buffer.subarray(0, 4).toString("ascii") === "RIFF"
    && buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
};

const uploadBuffer = (buffer, options) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
    if (error) reject(error);
    else resolve(result);
  });
  stream.end(buffer);
});

const safePathPart = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, "_");

export const uploadSellerImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: "fail",
        code: "IMAGE_FILE_REQUIRED",
        message: "Vui lòng chọn một file ảnh."
      });
    }

    const detectedMimeType = detectImageMimeType(req.file.buffer);
    if (!detectedMimeType || detectedMimeType !== req.file.mimetype) {
      return res.status(400).json({
        status: "fail",
        code: "INVALID_IMAGE_CONTENT",
        message: "Nội dung file không khớp định dạng ảnh JPG, PNG hoặc WebP."
      });
    }

    const purpose = String(req.body?.purpose || "").trim();
    if (!ALLOWED_PURPOSES.has(purpose)) {
      return res.status(400).json({
        status: "fail",
        code: "INVALID_IMAGE_PURPOSE",
        message: "purpose chỉ nhận product, shop_logo hoặc shop_cover."
      });
    }

    const userFolder = safePathPart(req.user.id);
    const transformations = purpose === "shop_cover"
      ? [{ width: 1600, height: 600, crop: "limit" }]
      : purpose === "shop_logo"
        ? [{ width: 600, height: 600, crop: "limit" }]
        : [{ width: 1600, height: 1600, crop: "limit" }];
    const upload = await uploadBuffer(req.file.buffer, {
      folder: `volitify/${userFolder}/${purpose}`,
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: transformations
    });

    return res.status(201).json({
      status: "success",
      data: {
        url: upload.secure_url,
        publicId: upload.public_id,
        purpose,
        width: upload.width,
        height: upload.height,
        bytes: upload.bytes,
        format: upload.format
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteSellerImage = async (req, res, next) => {
  try {
    const publicId = String(
      req.params?.publicId || req.body?.publicId || req.query?.publicId || ""
    ).trim();
    if (!publicId) {
      return res.status(400).json({
        status: "fail",
        code: "PUBLIC_ID_REQUIRED",
        message: "publicId là bắt buộc."
      });
    }

    const ownerPrefix = `volitify/${safePathPart(req.user.id)}/`;
    if (!publicId.startsWith(ownerPrefix)) {
      return res.status(403).json({
        status: "fail",
        code: "IMAGE_NOT_OWNED",
        message: "Bạn không có quyền xóa ảnh này."
      });
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true
    });
    if (!["ok", "not found"].includes(result.result)) {
      throw new Error(`Cloudinary delete failed: ${result.result}`);
    }
    return res.status(200).json({
      status: "success",
      data: { publicId, deleted: result.result === "ok" }
    });
  } catch (error) {
    return next(error);
  }
};
