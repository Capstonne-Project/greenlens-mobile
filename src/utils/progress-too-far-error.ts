import { isAxiosError } from 'axios';

export const PROGRESS_TOO_FAR_CODE = 'PROGRESS_TOO_FAR';

/**
 * BE format khoảng cách theo GeoDistanceFormatting.Format: "{N}m" nếu < 1000m,
 * "{X.X} km" nếu >= 1000m (VD: "...khoảng 350m..." hoặc "...khoảng 1.5 km...").
 */
function parseDistanceMeters(message: string | undefined): number | null {
  if (!message) return null;
  const kmMatch = message.match(/(\d+(?:\.\d+)?)\s*km\b/);
  if (kmMatch) return Math.round(parseFloat(kmMatch[1]) * 1000);
  const mMatch = message.match(/(\d+)\s*m\b/);
  return mMatch ? parseInt(mMatch[1], 10) : null;
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
