import { addressService } from "../services/addressService.js";

export const getAddresses = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const addresses = await addressService.getUserAddresses(userId);
    res.status(200).json({
      status: "success",
      data: addresses,
    });
  } catch (error) {
    next(error);
  }
};

export const addAddress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { recipient_name, phone_number, street_address, city, is_default } = req.body;

    if (!recipient_name || !phone_number || !street_address || !city) {
      return res.status(400).json({
        status: "fail",
        message: "Vui lòng cung cấp đầy đủ thông tin địa chỉ.",
      });
    }

    const newAddress = await addressService.createAddress(userId, {
      recipient_name,
      phone_number,
      street_address,
      city,
      is_default,
    });

    res.status(201).json({
      status: "success",
      message: "Thêm địa chỉ thành công.",
      data: newAddress,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { recipient_name, phone_number, street_address, city, is_default } = req.body;

    if (!recipient_name || !phone_number || !street_address || !city) {
      return res.status(400).json({
        status: "fail",
        message: "Vui lòng cung cấp đầy đủ thông tin địa chỉ.",
      });
    }

    const updatedAddress = await addressService.updateAddress(id, userId, {
      recipient_name,
      phone_number,
      street_address,
      city,
      is_default,
    });

    res.status(200).json({
      status: "success",
      message: "Cập nhật địa chỉ thành công.",
      data: updatedAddress,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const success = await addressService.deleteAddress(id, userId);
    if (!success) {
      return res.status(404).json({
        status: "fail",
        message: "Không tìm thấy địa chỉ.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Xóa địa chỉ thành công.",
    });
  } catch (error) {
    next(error);
  }
};

export const setDefaultAddress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await addressService.setDefault(id, userId);

    res.status(200).json({
      status: "success",
      message: "Đã đặt làm địa chỉ mặc định.",
    });
  } catch (error) {
    next(error);
  }
};
