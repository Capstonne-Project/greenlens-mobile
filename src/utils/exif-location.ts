import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { gps as exifrGps } from 'exifr';

/**
 * Android 10+ mặc định strip GPS khỏi EXIF khi đọc ảnh qua content URI (MediaStore) —
 * quyền `READ_MEDIA_IMAGES`/`requestMediaLibraryPermissionsAsync` của expo-image-picker
 * KHÔNG bao gồm `ACCESS_MEDIA_LOCATION`. Phải xin riêng qua expo-media-library, nếu không
 * mọi ảnh (kể cả vừa chụp) sẽ luôn thiếu GPS khi đọc lại trên thiết bị thật.
 */
export async function ensureMediaLocationPermission(): Promise<void> {
  try {
    await MediaLibrary.requestPermissionsAsync(false);
  } catch {
    // Không chặn luồng chọn/chụp ảnh nếu quyền bị từ chối — fallback vẫn cảnh báo thiếu GPS.
  }
}

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

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const byteLength = Math.floor((clean.length * 6) / 8);
  const bytes = new Uint8Array(byteLength);
  let byteIndex = 0;
  let buffer = 0;
  let bufferBits = 0;

  for (let i = 0; i < clean.length; i++) {
    const value = BASE64_CHARS.indexOf(clean[i]);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bufferBits += 6;
    if (bufferBits >= 8) {
      bufferBits -= 8;
      bytes[byteIndex++] = (buffer >> bufferBits) & 0xff;
    }
  }
  return bytes;
}

/**
 * Đọc GPS trực tiếp từ file ảnh gốc (không qua field `exif` của ImagePicker) bằng exifr.
 * `expo-image-picker` trên Android nhiều khi trả `exif: null`/thiếu GPS dù ảnh gốc có metadata
 * (OEM/Android version khác nhau) — đọc thẳng bytes ảnh đáng tin cậy hơn nhiều.
 */
export async function readGpsFromFileExif(fileUri: string): Promise<ExifGpsCoords | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
    const bytes = base64ToUint8Array(base64);
    const result = await exifrGps(bytes);
    if (!result) return null;
    const { latitude, longitude } = result;
    if (!isValidCoords(latitude, longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
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
