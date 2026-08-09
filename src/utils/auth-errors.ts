import { isAxiosError } from 'axios';

/** Error code BE trả về ở `code` — dùng để hiện đúng nguyên nhân thay vì message chung. */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  OTP_EXPIRED: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.',
  OTP_INVALID: 'Mã OTP không đúng. Kiểm tra lại mã trong email.',
  OTP_MAX_ATTEMPTS: 'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.',
  WEAK_PASSWORD:
    'Mật khẩu chưa đủ mạnh. Cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.',
  PASSWORD_RECENTLY_USED: 'Mật khẩu mới không được trùng với 3 mật khẩu gần nhất.',
  USER_NOT_FOUND: 'Không tìm thấy tài khoản với email này.',
  GOOGLE_AUTH_FAILED: 'Xác thực Google không thành công. Vui lòng thử lại.',
  INCORRECT_CURRENT_PASSWORD: 'Mật khẩu hiện tại không đúng.',
  ACCOUNT_LOCKED: 'Tài khoản đang bị khóa. Vui lòng thử lại sau.',
};

/** Code cần buộc người dùng xin OTP mới thay vì nhập lại. */
const OTP_RETRY_REQUIRED = new Set(['OTP_EXPIRED', 'OTP_MAX_ATTEMPTS']);

function extractCode(error: unknown): string | null {
  if (!isAxiosError(error)) return null;
  const body = error.response?.data as { code?: string } | undefined;
  return typeof body?.code === 'string' ? body.code : null;
}

/** Message thân thiện cho lỗi auth — ưu tiên code, rồi message BE, cuối cùng là fallback. */
export function getAuthErrorMessage(error: unknown, fallback: string): string {
  const code = extractCode(error);
  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }

  if (isAxiosError(error)) {
    if (!error.response) {
      return 'Không kết nối được máy chủ. Kiểm tra kết nối mạng và thử lại.';
    }
    const body = error.response.data as Record<string, unknown> | undefined;
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (message) return message;
  }

  return fallback;
}

/** True khi mã OTP hiện tại không còn dùng được — UI nên đẩy người dùng đi lấy mã mới. */
export function requiresNewOtp(error: unknown): boolean {
  const code = extractCode(error);
  return code !== null && OTP_RETRY_REQUIRED.has(code);
}
