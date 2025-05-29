/**
 * Định dạng ngày tháng từ chuỗi ISO sang định dạng hiển thị thân thiện
 * @param dateString Chuỗi ngày tháng theo định dạng ISO
 * @returns Chuỗi ngày tháng đã định dạng
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  
  // Định dạng ngày tháng
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  // Định dạng giờ phút
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Định dạng số tiền sang định dạng tiền tệ VND
 * @param amount Số tiền cần định dạng
 * @returns Chuỗi tiền tệ đã định dạng
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Rút gọn chuỗi nếu quá dài
 * @param text Chuỗi cần rút gọn
 * @param maxLength Độ dài tối đa
 * @returns Chuỗi đã rút gọn
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
