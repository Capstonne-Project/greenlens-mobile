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

export function buildReportFileName(uri: string, mimeType: string): string {
  const extension = mimeType.split('/')[1] ?? 'jpg';
  const suffix = uri.split('/').pop()?.split('.')[0] ?? `${Date.now()}`;
  return `report-${suffix}.${extension}`;
}
