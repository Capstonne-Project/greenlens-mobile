const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
};

export function guessMimeTypeFromUri(uri: string): string {
  const extension = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  return MIME_BY_EXTENSION[extension] ?? 'image/jpeg';
}

/** Chuẩn hóa đuôi file cho upload — tránh `image/jpeg` → `.jpeg` (một số BE/R2 hay lệch). */
export function extensionFromMimeType(mimeType: string): string {
  const raw = mimeType.split('/')[1]?.toLowerCase() ?? 'jpg';
  if (raw === 'jpeg' || raw === 'jpg') return 'jpg';
  if (raw === 'png') return 'png';
  if (raw === 'webp') return 'webp';
  if (raw === 'heic' || raw === 'heif') return 'heic';
  return 'jpg';
}

export function buildReportFileName(uri: string, mimeType: string): string {
  const extension = extensionFromMimeType(mimeType);
  const rawName = uri.split('/').pop()?.split('?')[0] ?? `${Date.now()}`;
  const suffix = rawName.replace(/\.[^.]+$/, '') || `${Date.now()}`;
  return `report-${suffix}.${extension}`;
}
