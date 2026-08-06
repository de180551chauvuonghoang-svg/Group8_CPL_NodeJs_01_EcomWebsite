const SHOP_PHONE_PATTERN = /^0\d{9}$/;
const IDENTITY_NUMBER_PATTERN = /^\d{12}$/;
const BANK_ACCOUNT_PATTERN = /^\d{6,20}$/;

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const isOptionalTextOmitted = (value) =>
  value === undefined || value === null || (typeof value === "string" && !value.trim());

export const normalizeSellerContact = ({
  shopPhone,
  identityNumber,
  bankAccountNo
}) => ({
  shopPhone: normalizeText(shopPhone),
  identityNumber: normalizeText(identityNumber),
  bankAccountNo: normalizeText(bankAccountNo)
});

export const validateSellerContact = ({
  shopPhone,
  identityNumber,
  bankAccountNo
}) => {
  const normalizedShopPhone = normalizeText(shopPhone);
  const normalizedIdentityNumber = normalizeText(identityNumber);
  const normalizedBankAccountNo = normalizeText(bankAccountNo);

  if (!SHOP_PHONE_PATTERN.test(normalizedShopPhone)) {
    return "Số điện thoại shop phải gồm 10 chữ số và bắt đầu bằng số 0.";
  }

  if (
    !isOptionalTextOmitted(identityNumber) &&
    (typeof identityNumber !== "string" || !IDENTITY_NUMBER_PATTERN.test(normalizedIdentityNumber))
  ) {
    return "Số CCCD phải gồm đúng 12 chữ số.";
  }

  if (
    !isOptionalTextOmitted(bankAccountNo) &&
    (typeof bankAccountNo !== "string" || !BANK_ACCOUNT_PATTERN.test(normalizedBankAccountNo))
  ) {
    return "Số tài khoản phải gồm từ 6 đến 20 chữ số.";
  }

  return null;
};

export const validateProductNumbers = ({ price, stock }, { requirePrice = false } = {}) => {
  const hasPrice = price !== undefined;
  const hasStock = stock !== undefined;

  if (requirePrice && !hasPrice) {
    return "Giá sản phẩm là bắt buộc.";
  }

  if (hasPrice) {
    if (!Number.isFinite(price) || price <= 0) {
      return "Giá sản phẩm phải là số lớn hơn 0.";
    }
  }

  if (hasStock) {
    if (!Number.isInteger(stock) || stock < 0) {
      return "Số lượng tồn kho phải là số nguyên không âm.";
    }
  }

  return null;
};
