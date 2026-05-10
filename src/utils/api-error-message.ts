import axios from 'axios';

const NETWORK_HINT =
  'Không kết nối được API. Trên Android emulator hãy đặt EXPO_PUBLIC_API_URL=http://10.0.2.2:5162/v1 (localhost trên emulator không trỏ về máy dev). Trên điện thoại thật dùng IP LAN của máy (vd. http://192.168.1.x:5162/v1).';

/** Trích message thân thiện từ Axios / Error — không log payload nhạy cảm */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return 'Hết thời gian chờ máy chủ. Kiểm tra API có đang chạy và URL trong .env.';
    }
    if (!error.response) {
      return NETWORK_HINT;
    }

    const status = error.response.status;
    const body = error.response.data as Record<string, unknown> | undefined;
    const msg =
      typeof body?.message === 'string'
        ? body.message
        : typeof body?.Message === 'string'
          ? body.Message
          : undefined;

    if (typeof msg === 'string' && msg.trim()) {
      return msg.trim();
    }

    if (status === 401) {
      return 'Email hoặc mật khẩu không đúng.';
    }
    if (status === 400 || status === 422) {
      return 'Dữ liệu gửi lên không hợp lệ.';
    }

    return fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
