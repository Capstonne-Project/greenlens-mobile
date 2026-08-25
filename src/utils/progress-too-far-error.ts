import { isAxiosError } from 'axios';

export const PROGRESS_TOO_FAR_CODE = 'PROGRESS_TOO_FAR';

/** BE trả message dạng "...cách vị trí yêu cầu {N}m, quá xa..." — tách số mét để hiển thị dialog. */
function parseDistanceMeters(message: string | undefined): number | null {
  if (!message) return null;
  const match = message.match(/(\d+)\s*m\b/);
  return match ? parseInt(match[1], 10) : null;
}

export function getProgressTooFarDistanceMeters(error: unknown): number | null {
  if (!isAxiosError(error)) return null;
  const body = error.response?.data as { code?: string; message?: string } | undefined;
  if (body?.code !== PROGRESS_TOO_FAR_CODE) return null;
  return parseDistanceMeters(body.message);
}

export function isProgressTooFarError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  const body = error.response?.data as { code?: string } | undefined;
  return body?.code === PROGRESS_TOO_FAR_CODE;
}
