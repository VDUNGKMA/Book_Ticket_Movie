/**
 * Format a number as VND currency
 * @param amount The amount to format
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number): string => {
  // Make sure amount is a valid number
  if (isNaN(amount)) amount = 0;

  // Format with dot as thousand separator and no decimal places
  return (
    amount.toLocaleString("vi-VN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + "đ"
  );
};
