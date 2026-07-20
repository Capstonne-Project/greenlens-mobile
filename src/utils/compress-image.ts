import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface CompressedImage {
  uri: string;
  mimeType: string;
  fileName: string;
  width?: number;
  height?: number;
}

export interface CompressImageOptions {
  /** Cạnh dài tối đa (px). Mặc định 1600 — đủ chi tiết cho AI. */
  maxDimension?: number;
  /** Chất lượng JPEG 0–1. Mặc định 0.72. */
  quality?: number;
  /** Tên file mong muốn (không cần đuôi). */
  baseName?: string;
  sourceWidth?: number;
  sourceHeight?: number;
}

/** Cân bằng upload nhanh và giữ chi tiết rác/khói/nước cho AI classification. */
export const UPLOAD_COMPRESS_PRESET: Required<
  Pick<CompressImageOptions, 'maxDimension' | 'quality'>
> = {
  maxDimension: 1600,
  quality: 0.72,
};

const DEFAULT_MAX_DIMENSION = UPLOAD_COMPRESS_PRESET.maxDimension;
const DEFAULT_QUALITY = UPLOAD_COMPRESS_PRESET.quality;

function buildResizeAction(
  maxDimension: number,
  width?: number,
  height?: number,
): { resize: { width?: number; height?: number } } | null {
  if (!width || !height) {
    // Không biết kích thước → giới hạn theo width (Expo giữ tỉ lệ).
    return { resize: { width: maxDimension } };
  }

  const longest = Math.max(width, height);
  if (longest <= maxDimension) return null;

  return width >= height
    ? { resize: { width: maxDimension } }
    : { resize: { height: maxDimension } };
}

/**
 * Nén + resize + convert sang JPEG trước khi upload.
 * Dùng manipulateAsync (ổn định hơn API context mới trên một số build).
 */
export async function compressImage(
  uri: string,
  options: CompressImageOptions = {},
): Promise<CompressedImage> {
  const {
    maxDimension = DEFAULT_MAX_DIMENSION,
    quality = DEFAULT_QUALITY,
    baseName = 'image',
    sourceWidth,
    sourceHeight,
  } = options;

  try {
    let width = sourceWidth;
    let height = sourceHeight;
    let workingUri = uri;

    // Convert JPEG trước nếu chưa biết kích thước — cũng xử lý HEIC → JPEG.
    if (!width || !height) {
      const probe = await manipulateAsync(uri, [], {
        compress: 1,
        format: SaveFormat.JPEG,
      });
      workingUri = probe.uri;
      width = probe.width;
      height = probe.height;
    }

    const resize = buildResizeAction(maxDimension, width, height);
    const actions = resize ? [resize] : [];
    const result = await manipulateAsync(workingUri, actions, {
      compress: quality,
      format: SaveFormat.JPEG,
    });

    if (__DEV__) {
      console.log(
        '[compressImage]',
        `${width}x${height} → ${result.width}x${result.height}`,
        `q=${quality}`,
      );
    }

    return {
      uri: result.uri,
      mimeType: 'image/jpeg',
      fileName: `${baseName}_${Date.now()}.jpg`,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    if (__DEV__) {
      console.warn('[compressImage] failed', error);
    }
    throw error;
  }
}

/** Nén tối ưu cho upload mạng — JPEG đủ chi tiết cho AI, retry với preset nhẹ hơn. */
export async function compressImageForUpload(
  uri: string,
  baseName = 'upload',
): Promise<CompressedImage> {
  try {
    return await compressImage(uri, {
      ...UPLOAD_COMPRESS_PRESET,
      baseName,
    });
  } catch {
    return compressImage(uri, {
      maxDimension: 1280,
      quality: 0.62,
      baseName,
    });
  }
}

export function compressImages(
  uris: string[],
  options: CompressImageOptions = {},
): Promise<CompressedImage[]> {
  return Promise.all(uris.map((uri) => compressImage(uri, options)));
}
