/** Shared layout tokens for auth earth ↔ dialog alignment. */
export const AUTH_LOGIN_DIALOG_TOP_RATIO = 0.36;
export const AUTH_LOGIN_HEADER_EARTH_MAX = 176;

/**
 * Tỉ lệ chiều cao dải trên (từ đỉnh màn tới mép dialog) của từng màn auth.
 *
 * Form càng nhiều field thì dialog càng kéo cao → dải trên càng hẹp. Quả đất được đặt
 * giữa dải này nên phải biết ratio của màn đang hiển thị, nếu không sẽ tràn xuống che dialog.
 */
export const AUTH_DIALOG_TOP_RATIO_BY_ROUTE: Record<string, number> = {
  login: AUTH_LOGIN_DIALOG_TOP_RATIO,
  register: 0.19,
  'forgot-password': 0.3,
  'verify-reset-otp': 0.26,
  'reset-password': 0.24,
  'verify-otp': 0.3,
};

/** Chiều cao tối thiểu (px) của dải trên, khớp `Math.max(...)` trong từng màn. */
export const AUTH_DIALOG_TOP_MIN_BY_ROUTE: Record<string, number> = {
  login: 220,
  register: 108,
  'forgot-password': 180,
  'verify-reset-otp': 150,
  'reset-password': 140,
  'verify-otp': 180,
};

/** Ratio/min của route hiện tại; mặc định theo login khi không khớp route nào. */
export function getAuthDialogTopMetrics(pathname: string): { ratio: number; min: number } {
  const key = Object.keys(AUTH_DIALOG_TOP_RATIO_BY_ROUTE).find((route) =>
    pathname.includes(route),
  );
  return {
    ratio: key ? AUTH_DIALOG_TOP_RATIO_BY_ROUTE[key] : AUTH_LOGIN_DIALOG_TOP_RATIO,
    min: key ? (AUTH_DIALOG_TOP_MIN_BY_ROUTE[key] ?? 180) : 220,
  };
}

/**
 * Chiều cao dải trên của một màn auth. Màn và `AuthEarthProvider` phải dùng chung hàm này,
 * nếu không quả đất sẽ đặt sai chỗ so với mép dialog.
 */
export function getAuthDialogTop(routeKey: string, screenHeight: number): number {
  const { ratio, min } = getAuthDialogTopMetrics(routeKey);
  return Math.max(screenHeight * ratio, min);
}
