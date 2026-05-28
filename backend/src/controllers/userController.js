export const authMe = async (req, res) => {
  try {
    const user = req.user; // Lấy user từ req (đã được middleware xác thực gán vào)
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }
    // Trả về thông tin user (có thể loại bỏ các trường nhạy cảm như password)
    const { id, name, email, phonenumber, role } = user;
    return res.status(200).json({
      status: "success",
      data: {
        id,
        name,
        email,
        phonenumber,
        role,
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching user data",
    });
  }
};
