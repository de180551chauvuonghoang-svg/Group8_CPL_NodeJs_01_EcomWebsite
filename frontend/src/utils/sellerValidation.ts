const VIETNAM_PHONE_PATTERN = /^0\d{9}$/;
const CCCD_PATTERN = /^\d{12}$/;
const BANK_ACCOUNT_PATTERN = /^\d{6,20}$/;

export const isValidShopPhone = (value: string) => VIETNAM_PHONE_PATTERN.test(value.trim());

export const isValidOptionalIdentityNumber = (value: string) => {
  const normalizedValue = value.trim();
  return !normalizedValue || CCCD_PATTERN.test(normalizedValue);
};

export const isValidOptionalBankAccount = (value: string) => {
  const normalizedValue = value.trim();
  return !normalizedValue || BANK_ACCOUNT_PATTERN.test(normalizedValue);
};

export const isPositivePrice = (value: string) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0;
};

export const isNonNegativeInteger = (value: string) => {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue >= 0;
};
