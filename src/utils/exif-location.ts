export interface ExifGpsCoords {
  latitude: number;
  longitude: number;
}

export interface ImagePickerLocationLike {
  latitude: number;
  longitude: number;
}

/** Subset of expo-image-picker asset fields used for GPS extraction. */
export interface ImageAssetGpsSource {
  exif?: Record<string, unknown> | null;
  location?: ImagePickerLocationLike | null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidCoords(latitude: number, longitude: number): boolean {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  // Android pickers đôi khi trả 0/0 khi strip GPS — bỏ qua.
  if (latitude === 0 && longitude === 0) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  return true;
}

function dmsToDecimal(dms: unknown, ref: unknown): number | null {
  if (!Array.isArray(dms) || dms.length < 3) return null;
  const [degrees, minutes, seconds] = dms;
  if (!isFiniteNumber(degrees) || !isFiniteNumber(minutes) || !isFiniteNumber(seconds)) {
    return null;
  }

  let decimal = Math.abs(degrees) + minutes / 60 + seconds / 3600;
  const refStr = typeof ref === 'string' ? ref.toUpperCase() : '';
  if (refStr === 'S' || refStr === 'W' || degrees < 0) {
    decimal = -decimal;
  }
  return decimal;
}

function readDecimalOrDms(
  value: unknown,
  ref: unknown,
): number | null {
  if (isFiniteNumber(value)) {
    if (typeof ref === 'string') {
      const refStr = ref.toUpperCase();
      if ((refStr === 'S' || refStr === 'W') && value > 0) return -value;
    }
    return value;
  }
  return dmsToDecimal(value, ref);
}

function parseGpsBlock(gps: Record<string, unknown>): ExifGpsCoords | null {
  const latitude = readDecimalOrDms(gps.Latitude ?? gps.GPSLatitude, gps.LatitudeRef ?? gps.GPSLatitudeRef);
  const longitude = readDecimalOrDms(gps.Longitude ?? gps.GPSLongitude, gps.LongitudeRef ?? gps.GPSLongitudeRef);
  if (latitude === null || longitude === null) return null;
  if (!isValidCoords(latitude, longitude)) return null;
  return { latitude, longitude };
}

/**
 * Đọc lat/lng từ object EXIF của expo-image-picker (trước khi compress/strip).
 * Hỗ trợ decimal, DMS array, và block `{GPS}` trên một số thiết bị.
 */
export function parseExifGps(exif: Record<string, unknown> | null | undefined): ExifGpsCoords | null {
  if (!exif || typeof exif !== 'object') return null;

  const nestedGps = exif['{GPS}'];
  if (nestedGps && typeof nestedGps === 'object' && !Array.isArray(nestedGps)) {
    const fromNested = parseGpsBlock(nestedGps as Record<string, unknown>);
    if (fromNested) return fromNested;
  }

  const latitude = readDecimalOrDms(exif.GPSLatitude, exif.GPSLatitudeRef);
  const longitude = readDecimalOrDms(exif.GPSLongitude, exif.GPSLongitudeRef);
  if (latitude === null || longitude === null) return null;
  if (!isValidCoords(latitude, longitude)) return null;
  return { latitude, longitude };
}

/**
 * Ưu tiên `asset.location` (nếu platform cung cấp), sau đó EXIF GPS.
 * Gọi trước `compressImage` — nén JPEG sẽ mất metadata.
 */
export function parseLocationFromPickerAsset(asset: ImageAssetGpsSource): ExifGpsCoords | null {
  const direct = asset.location;
  if (
    direct &&
    isFiniteNumber(direct.latitude) &&
    isFiniteNumber(direct.longitude) &&
    isValidCoords(direct.latitude, direct.longitude)
  ) {
    return { latitude: direct.latitude, longitude: direct.longitude };
  }

  return parseExifGps(asset.exif ?? null);
}

/** Lấy GPS từ ảnh đầu tiên trong selection có metadata vị trí. */
export function parseLocationFromPickerAssets(assets: ImageAssetGpsSource[]): ExifGpsCoords | null {
  for (const asset of assets) {
    const coords = parseLocationFromPickerAsset(asset);
    if (coords) return coords;
  }
  return null;
}

/**
 * Lấy GPS từ TẤT CẢ ảnh trong selection có metadata vị trí (không dừng ở ảnh đầu).
 * Dùng khi cần fallback sang ảnh khác nếu reverse-geocode ảnh đầu không ra tỉnh/phường.
 */
export function parseAllLocationsFromPickerAssets(
  assets: ImageAssetGpsSource[],
): ExifGpsCoords[] {
  const results: ExifGpsCoords[] = [];
  for (const asset of assets) {
    const coords = parseLocationFromPickerAsset(asset);
    if (!coords) continue;
    const isDuplicate = results.some(
      (r) => r.latitude === coords.latitude && r.longitude === coords.longitude,
    );
    if (!isDuplicate) results.push(coords);
  }
  return results;
}
