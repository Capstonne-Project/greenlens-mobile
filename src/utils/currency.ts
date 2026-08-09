/** Format số nguyên VND thành chuỗi có dấu chấm phân cách nghìn — dùng khi hiển thị/nhập liệu. */
export function formatVndDigits(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('vi-VN');
}

/** Bóc lại số nguyên thuần từ chuỗi đã format (bỏ dấu chấm). */
export function parseVndDigits(formatted: string): number {
  const digits = formatted.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

const ONES = [
  '',
  'một',
  'hai',
  'ba',
  'bốn',
  'năm',
  'sáu',
  'bảy',
  'tám',
  'chín',
];

/** Đọc 1 nhóm 3 chữ số (0-999) thành chữ — dùng nội bộ cho `vndToWords`. */
function readThreeDigits(n: number, isFirstGroup: boolean): string {
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  const ten = Math.floor(remainder / 10);
  const unit = remainder % 10;

  const parts: string[] = [];

  if (hundred > 0 || !isFirstGroup) {
    parts.push(`${hundred > 0 ? ONES[hundred] : 'không'} trăm`);
  }

  if (ten === 0) {
    if (unit > 0) {
      if (hundred > 0 || !isFirstGroup) parts.push('lẻ');
      parts.push(ONES[unit]);
    }
  } else if (ten === 1) {
    parts.push('mười');
    if (unit === 5) parts.push('lăm');
    else if (unit > 0) parts.push(ONES[unit]);
  } else {
    parts.push(`${ONES[ten]} mươi`);
    if (unit === 1) parts.push('mốt');
    else if (unit === 5) parts.push('lăm');
    else if (unit > 0) parts.push(ONES[unit]);
  }

  return parts.join(' ').trim();
}

const GROUP_UNITS = ['', 'nghìn', 'triệu', 'tỷ'];

/** Đọc số tiền VND thành chữ tiếng Việt — VD: 48000000 → "Bốn mươi tám triệu đồng". */
export function vndToWords(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '';

  const intAmount = Math.floor(amount);
  const groups: number[] = [];
  let remaining = intAmount;
  while (remaining > 0) {
    groups.unshift(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }
  if (groups.length === 0) groups.push(0);

  const totalGroups = groups.length;
  const words: string[] = [];

  groups.forEach((group, index) => {
    if (group === 0) return;
    const groupIndexFromEnd = totalGroups - 1 - index;
    const isFirstGroup = index === 0;
    const groupWords = readThreeDigits(group, isFirstGroup);
    const unit = GROUP_UNITS[groupIndexFromEnd] ?? '';
    words.push(unit ? `${groupWords} ${unit}` : groupWords);
  });

  const sentence = words.join(' ').replace(/\s+/g, ' ').trim();
  const capitalized = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  return `${capitalized} đồng`;
}
