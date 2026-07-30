/** Tiền tố đơn vị hành chính — bỏ khi so khớp để "TP. Hồ Chí Minh" ≈ "Hồ Chí Minh". */
const ADMIN_PREFIX_RE =
  /^(tinh|thanh pho|tp\.?|quan|huyen|thi xa|phuong|xa|thi tran)\s+/g;

/**
 * Bỏ dấu tiếng Việt + lowercase + gom khoảng trắng. Không bỏ tiền tố hành chính.
 *
 * `đ/Đ` phải xử lý riêng: đây là chữ cái độc lập trong bảng chữ cái tiếng Việt,
 * không phải nguyên âm mang dấu, nên normalize('NFD') KHÔNG tách ra được.
 * Thiếu bước này thì gõ "da nang" sẽ không khớp "Đà Nẵng".
 */
export function removeDiacritics(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Chuẩn hoá tên đơn vị hành chính để so khớp: bỏ dấu, lowercase, bỏ tiền tố
 * (Tỉnh/Thành phố/TP./Quận/Huyện/Phường/Xã…).
 *
 * "TP. Hồ Chí Minh" → "ho chi minh" · "Phường Bến Nghé" → "ben nghe"
 */
export function normalizeAdminName(value: string): string {
  return removeDiacritics(value).replace(ADMIN_PREFIX_RE, '').trim();
}

/**
 * Chuỗi chữ cái đầu của từng từ — để gõ tắt "hcm" khớp "Hồ Chí Minh".
 * Tính trên tên đã bỏ tiền tố nên "TP. Hồ Chí Minh" ra "hcm", không phải "thcm".
 */
export function getInitialsKey(value: string): string {
  return normalizeAdminName(value)
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('');
}

/** Bỏ mọi khoảng trắng — để "hochiminh" khớp "Hồ Chí Minh". */
export function compactKey(value: string): string {
  return normalizeAdminName(value).replace(/\s+/g, '');
}
